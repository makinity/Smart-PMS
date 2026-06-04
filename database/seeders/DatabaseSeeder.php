<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Database\Seeders\UwpSampleSeeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'pmt', 'dept-head', 'supervisor', 'employee'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $this->call([
            UserSeeder::class,
            UwpSampleSeeder::class,
        ]);
    }
}
