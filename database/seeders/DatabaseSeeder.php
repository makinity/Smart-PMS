<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'pmt', 'dept-head', 'supervisor', 'employee'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }
}
