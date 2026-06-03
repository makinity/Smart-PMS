<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

class AdminDatabaseService
{
    private const BACKUP_DIRECTORY = 'database-backups';
    private const CONFIRMATION_PHRASE = 'RESTORE';

    public function environmentStatus(): array
    {
        $connection = config('database.default');
        $driver = strtolower((string) config("database.connections.{$connection}.driver", ''));
        $database = (string) config("database.connections.{$connection}.database", '');
        $host = (string) config("database.connections.{$connection}.host", '');
        $port = (string) config("database.connections.{$connection}.port", '');

        $mysqldump = $this->binaryStatus($this->mysqldumpBinary());
        $mysql = $this->binaryStatus($this->mysqlBinary());

        return [
            'connection' => (string) $connection,
            'driver' => $driver !== '' ? $driver : 'unknown',
            'database' => $database !== '' ? $database : 'unknown',
            'host' => $host !== '' ? $host : 'localhost',
            'port' => $port !== '' ? $port : '3306',
            'supported' => $this->isSupported(),
            'mysqldump_available' => $mysqldump['available'],
            'mysqldump_message' => $mysqldump['message'],
            'mysql_available' => $mysql['available'],
            'mysql_message' => $mysql['message'],
            'backup_directory' => storage_path('app/private/' . self::BACKUP_DIRECTORY),
            'confirmation_phrase' => self::CONFIRMATION_PHRASE,
        ];
    }

    public function listBackups(): array
    {
        $disk = Storage::disk('local');
        $files = collect($disk->files(self::BACKUP_DIRECTORY))
            ->filter(fn (string $path): bool => $this->isValidBackupFilename(basename($path)))
            ->map(function (string $path) use ($disk): array {
                $filename = basename($path);
                $lastModified = $disk->lastModified($path);

                return [
                    'filename' => $filename,
                    'path' => $path,
                    'size_bytes' => (int) $disk->size($path),
                    'size_label' => $this->formatBytes((int) $disk->size($path)),
                    'created_at' => Carbon::createFromTimestamp($lastModified),
                    'created_label' => Carbon::createFromTimestamp($lastModified)->format('M d, Y h:i A'),
                    'driver' => 'mysql',
                    'database' => $this->extractDatabaseName($filename),
                ];
            })
            ->sortByDesc(fn (array $backup) => $backup['created_at']->timestamp)
            ->values()
            ->all();

        return $files;
    }

    public function createBackup(): array
    {
        $this->ensureSupportedEnvironment();
        $this->ensureBackupDirectoryExists();

        $database = Str::slug((string) $this->connectionConfig('database'), '_');
        $filename = sprintf('backup_%s_%s.sql', $database, now()->format('Ymd_His'));
        $path = self::BACKUP_DIRECTORY . DIRECTORY_SEPARATOR . $filename;
        $absolutePath = Storage::disk('local')->path($path);

        $defaultsFile = $this->createDefaultsFile();

        try {
            $process = new Process([
                $this->mysqldumpBinary(),
                '--defaults-extra-file=' . $defaultsFile,
                '--single-transaction',
                '--routines',
                '--triggers',
                '--result-file=' . $absolutePath,
                (string) $this->connectionConfig('database'),
            ]);

            $process->setTimeout(300);
            $process->mustRun();
        } catch (\Throwable $e) {
            File::delete($absolutePath);

            throw new AdminDatabaseException('Backup creation failed. Verify MySQL client tools and database access.');
        } finally {
            File::delete($defaultsFile);
        }

        return $this->resolveBackup($filename);
    }

    public function restoreBackup(string $filename, string $confirmation): array
    {
        $this->ensureSupportedEnvironment();

        if (trim($confirmation) !== self::CONFIRMATION_PHRASE) {
            throw new AdminDatabaseException('Restore confirmation did not match the required phrase.');
        }

        $backup = $this->resolveBackup($filename);
        $defaultsFile = $this->createDefaultsFile();

        try {
            $process = new Process([
                $this->mysqlBinary(),
                '--defaults-extra-file=' . $defaultsFile,
                (string) $this->connectionConfig('database'),
            ]);

            $process->setTimeout(300);
            $process->setInput(File::get($this->absoluteBackupPath($backup['filename'])));
            $process->mustRun();
        } catch (\Throwable $e) {
            throw new AdminDatabaseException('Restore failed. Verify MySQL client tools and ensure the selected backup is valid.');
        } finally {
            File::delete($defaultsFile);
        }

        return $backup;
    }

    public function deleteBackup(string $filename): array
    {
        $backup = $this->resolveBackup($filename);
        Storage::disk('local')->delete($backup['path']);

        return $backup;
    }

    public function resolveBackup(string $filename): array
    {
        $safeFilename = basename($filename);
        if (!$this->isValidBackupFilename($safeFilename)) {
            throw new AdminDatabaseException('Invalid backup identifier.');
        }

        $path = self::BACKUP_DIRECTORY . DIRECTORY_SEPARATOR . $safeFilename;
        if (!Storage::disk('local')->exists($path)) {
            throw new AdminDatabaseException('Backup file not found.');
        }

        $size = (int) Storage::disk('local')->size($path);
        $lastModified = (int) Storage::disk('local')->lastModified($path);

        return [
            'filename' => $safeFilename,
            'path' => $path,
            'size_bytes' => $size,
            'size_label' => $this->formatBytes($size),
            'created_at' => Carbon::createFromTimestamp($lastModified),
            'created_label' => Carbon::createFromTimestamp($lastModified)->format('M d, Y h:i A'),
            'driver' => 'mysql',
            'database' => $this->extractDatabaseName($safeFilename),
        ];
    }

    public function absoluteBackupPath(string $filename): string
    {
        $backup = $this->resolveBackup($filename);

        return Storage::disk('local')->path($backup['path']);
    }

    public function isSupported(): bool
    {
        return strtolower((string) config('database.connections.' . config('database.default') . '.driver')) === 'mysql';
    }

    public function confirmationPhrase(): string
    {
        return self::CONFIRMATION_PHRASE;
    }

    private function ensureSupportedEnvironment(): void
    {
        if (!$this->isSupported()) {
            throw new AdminDatabaseException('Database backups are supported only when the active connection uses the MySQL driver.');
        }

        $config = [
            'host' => (string) $this->connectionConfig('host'),
            'port' => (string) $this->connectionConfig('port'),
            'database' => (string) $this->connectionConfig('database'),
            'username' => (string) $this->connectionConfig('username'),
        ];

        foreach ($config as $key => $value) {
            if ($value === '') {
                throw new AdminDatabaseException("Database configuration is incomplete: missing {$key}.");
            }
        }

        if (!$this->binaryStatus($this->mysqldumpBinary())['available']) {
            throw new AdminDatabaseException('mysqldump is not available to the application process.');
        }

        if (!$this->binaryStatus($this->mysqlBinary())['available']) {
            throw new AdminDatabaseException('mysql client is not available to the application process.');
        }
    }

    private function ensureBackupDirectoryExists(): void
    {
        File::ensureDirectoryExists(Storage::disk('local')->path(self::BACKUP_DIRECTORY));
    }

    private function createDefaultsFile(): string
    {
        $contents = implode(PHP_EOL, [
            '[client]',
            'host=' . $this->connectionConfig('host'),
            'port=' . $this->connectionConfig('port', '3306'),
            'user=' . $this->connectionConfig('username'),
            'password=' . $this->connectionConfig('password', ''),
            'default-character-set=' . $this->connectionConfig('charset', 'utf8mb4'),
            '',
        ]);

        $path = storage_path('app/private/' . self::BACKUP_DIRECTORY . '/mysql-client-' . Str::random(16) . '.cnf');
        File::ensureDirectoryExists(dirname($path));
        File::put($path, $contents);

        return $path;
    }

    private function binaryStatus(string $binary): array
    {
        try {
            $process = new Process([$binary, '--version']);
            $process->setTimeout(15);
            $process->run();

            if ($process->isSuccessful()) {
                return [
                    'available' => true,
                    'message' => trim($process->getOutput()) ?: trim($process->getErrorOutput()) ?: 'Available',
                ];
            }

            return [
                'available' => false,
                'message' => trim($process->getErrorOutput()) ?: 'Not available',
            ];
        } catch (\Throwable $e) {
            return [
                'available' => false,
                'message' => 'Not available',
            ];
        }
    }

    private function mysqldumpBinary(): string
    {
        return (string) env('MYSQLDUMP_BINARY', 'mysqldump');
    }

    private function mysqlBinary(): string
    {
        return (string) env('MYSQL_BINARY', 'mysql');
    }

    private function connectionConfig(string $key, mixed $default = null): mixed
    {
        return config('database.connections.' . config('database.default') . '.' . $key, $default);
    }

    private function isValidBackupFilename(string $filename): bool
    {
        return preg_match('/^backup_[A-Za-z0-9_]+_\d{8}_\d{6}\.sql$/', $filename) === 1;
    }

    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $value = (float) $bytes;
        $unitIndex = 0;

        while ($value >= 1024 && $unitIndex < count($units) - 1) {
            $value /= 1024;
            $unitIndex++;
        }

        return number_format($value, $unitIndex === 0 ? 0 : 2) . ' ' . $units[$unitIndex];
    }

    private function extractDatabaseName(string $filename): string
    {
        if (preg_match('/^backup_(.+)_\d{8}_\d{6}\.sql$/', $filename, $matches)) {
            return str_replace('_', ' ', (string) $matches[1]);
        }

        return 'unknown';
    }
}

class AdminDatabaseException extends \RuntimeException
{
}
