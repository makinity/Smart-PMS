<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Database\Seeders\UwpSampleSeeder;
use Illuminate\Support\Facades\Http;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Clear uploaded files so storage stays in sync with a fresh DB
        foreach (['ors_evidences', 'profile-photos', 'profiles'] as $dir) {
            $path = storage_path("app/public/{$dir}");
            if (is_dir($path)) {
                foreach (glob("{$path}/*") as $file) {
                    if (is_file($file) && basename($file) !== 'default.jpeg') unlink($file);
                }
            }
        }

        foreach (['admin', 'pmt', 'dept-head', 'supervisor', 'employee'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->call([
            UserSeeder::class,
            UwpSampleSeeder::class,
            OrsSampleSeeder::class,
            MlTrainingDataSeeder::class,
        ]);

        // After all seeders run, trigger ML model training
        try {
            Http::post(env('FASTAPI_URL') . '/train');
        } catch (\Exception $e) {
            $this->command->warn('ML training skipped: FastAPI not running.');
        }

    }
}
