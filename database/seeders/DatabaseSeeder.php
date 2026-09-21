<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Database\Seeders\UwpSampleSeeder;
use Database\Seeders\SpmsFullSeeder;
use Database\Seeders\SpmsH1CompleteSeeder;
use Database\Seeders\UwpSampleSeederH2;
use Database\Seeders\SpmsFullSeederH2;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $clearDirs = [
            'accomplishment_submissions',
            'ors_evidences',
            'profile-photos',
        ];
        foreach ($clearDirs as $dir) {
            $path = storage_path("app/public/{$dir}");
            if (!is_dir($path)) continue;
            foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS)) as $file) {
                if ($file->isFile()) unlink($file->getPathname());
            }
        }

        $profilesPath = storage_path('app/public/profiles');
        if (is_dir($profilesPath)) {
            foreach (glob("{$profilesPath}/*") as $file) {
                if (is_file($file) && basename($file) !== 'default.jpeg') unlink($file);
            }
        }

        foreach (['admin', 'pmt', 'dept-head', 'supervisor', 'employee'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->call([
            UserSeeder::class,
            UwpSampleSeeder::class,
            SpmsFullSeeder::class,
            SpmsH1CompleteSeeder::class,
            UwpSampleSeederH2::class,
            SpmsFullSeederH2::class,
            SpmsH2CompleteSeeder::class,
        ]);

    }
}