<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminDatabaseService;
use App\Services\AdminDatabaseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DatabaseController extends Controller
{
    public function __construct(private AdminDatabaseService $service) {}

    public function index(): \Inertia\Response
    {
        $env = $this->service->environmentStatus();
        $backups = $this->service->listBackups();

        return Inertia::render('Admin/Database/Index', [
            'env'     => $env,
            'backups' => $backups,
            'tables'  => $this->getExportableTables(),
        ]);
    }

    // ── Connection ────────────────────────────────────────────────────────────

    public function testConnection(Request $request): \Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'host'     => 'required|string|max:255',
            'port'     => 'required|integer|min:1|max:65535',
            'database' => 'required|string|max:255',
            'username' => 'required|string|max:255',
            'password' => 'nullable|string|max:255',
        ]);

        try {
            $pdo = new \PDO(
                "mysql:host={$data['host']};port={$data['port']};dbname={$data['database']};charset=utf8mb4",
                $data['username'],
                $data['password'] ?? '',
                [\PDO::ATTR_TIMEOUT => 5, \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]
            );
            $version = $pdo->query('SELECT VERSION()')->fetchColumn();
            return response()->json(['success' => true, 'message' => "Connected — {$data['database']} ({$data['host']}) · MySQL {$version}"]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()], 422);
        }
    }

    // ── Backup ────────────────────────────────────────────────────────────────

    public function backup(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate(['type' => 'required|in:full,incremental,differential,date_range']);

        try {
            $backup = $this->service->createBackup();
            return response()->json(['success' => true, 'backup' => $backup, 'backups' => $this->service->listBackups()]);
        } catch (AdminDatabaseException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function restore(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'file'         => 'required|file|mimes:sql,txt|max:512000',
            'confirmation' => 'required|string',
        ]);

        try {
            $file     = $request->file('file');
            $filename = $file->getClientOriginalName();
            $file->storeAs('database-backups', $filename, 'local');
            $backup   = $this->service->restoreBackup($filename, $request->confirmation);
            return response()->json(['success' => true, 'message' => 'Restore completed.', 'backup' => $backup]);
        } catch (AdminDatabaseException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function backups(): \Illuminate\Http\JsonResponse
    {
        return response()->json($this->service->listBackups());
    }

    public function downloadBackup(string $filename): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        try {
            $path = $this->service->absoluteBackupPath($filename);
            return response()->streamDownload(fn () => readfile($path), $filename, [
                'Content-Type' => 'application/octet-stream',
            ]);
        } catch (AdminDatabaseException $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }
    }

    public function deleteBackup(string $filename): \Illuminate\Http\JsonResponse
    {
        try {
            $this->service->deleteBackup($filename);
            return response()->json(['success' => true, 'backups' => $this->service->listBackups()]);
        } catch (AdminDatabaseException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    // ── Exports ───────────────────────────────────────────────────────────────

    public function tableInfo(Request $request): \Illuminate\Http\JsonResponse
    {
        $table = $request->validate(['table' => 'required|string|max:128'])['table'];

        if (!$this->isAllowedTable($table)) {
            return response()->json(['message' => 'Table not allowed.'], 403);
        }

        try {
            $columns = Schema::getColumnListing($table);
            $count   = DB::table($table)->count();
            return response()->json(['columns' => $columns, 'row_count' => $count]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Could not read table.'], 422);
        }
    }

    public function export(Request $request): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $data = $request->validate([
            'table'           => 'required|string|max:128',
            'format'          => 'required|in:csv,xlsx',
            'include_headers' => 'boolean',
            'include_date'    => 'boolean',
            'columns'         => 'nullable|array',
        ]);

        if (!$this->isAllowedTable($data['table'])) {
            return response()->json(['message' => 'Table not allowed.'], 403);
        }

        $table   = $data['table'];
        $columns = !empty($data['columns']) ? $data['columns'] : Schema::getColumnListing($table);
        $rows    = DB::table($table)->get(array_map(fn ($c) => $table . '.' . $c, $columns));

        $date     = $data['include_date'] ?? true ? '_' . now()->format('Y_m_d_His') : '';
        $filename = "{$table}{$date}.{$data['format']}";

        return response()->streamDownload(function () use ($rows, $columns, $data) {
            $out = fopen('php://output', 'w');
            if ($data['include_headers'] ?? true) {
                fputcsv($out, $columns);
            }
            foreach ($rows as $row) {
                fputcsv($out, (array) $row);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function getExportableTables(): array
    {
        $allowed = [
            'users', 'offices', 'performance_periods',
            'opcr_headers', 'opcr_rows',
            'uwp_tasks', 'uwp_submissions',
            'accomplishment_submissions',
            'qar_headers', 'qar_rows',
            'audit_logs',
        ];
        return array_values(array_filter($allowed, fn ($t) => Schema::hasTable($t)));
    }

    private function isAllowedTable(string $table): bool
    {
        return in_array($table, $this->getExportableTables(), true);
    }
}
