<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Office;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * DuplicateNameTestSeeder
 *
 * Creates a second "Carlos Mendoza" user in the CBO office to test the
 * duplicate-name → Employee ID disambiguation flow on the login screen.
 *
 * Run with:
 *   php artisan db:seed --class=DuplicateNameTestSeeder
 *
 * Remove test account with:
 *   php artisan db:seed --class=DuplicateNameTestSeeder --remove
 * (or just re-run the main seeder to reset)
 *
 * Test credentials:
 *   Original Carlos → name: "Carlos Mendoza"  emp_id: EMP-0006  password: password
 *   Duplicate Carlos → name: "Carlos Mendoza"  emp_id: EMP-TEST-DUPE  password: password
 */
class DuplicateNameTestSeeder extends Seeder
{
    public function run(): void
    {
        $cbo = Office::where('code', 'CBO')->first();

        $user = User::updateOrCreate(
            ['email' => 'carlos.dupe@pms.test'],
            [
                'name'     => 'Carlos Mendoza',
                'role'     => 'employee',
                'password' => Hash::make('password'),
            ]
        );

        $user->syncRoles('employee');

        Employee::updateOrCreate(
            ['user_id' => $user->id],
            [
                'employee_id'        => 'EMP-TEST-DUPE',
                'first_name'         => 'Carlos',
                'middle_name'        => null,
                'last_name'          => 'Mendoza',
                'office_id'          => $cbo?->id,
                'position'           => 'Budget Analyst II',
                'is_active'          => true,
                'activated_at'       => now(),
                'profile_photo_path' => 'sample-user-profile/3.jpg',
            ]
        );

        $this->command->info('Duplicate Carlos Mendoza (carlos.dupe@pms.test / EMP-TEST-DUPE) created.');
        $this->command->info('Login test: name="Carlos Mendoza", password="password" → should prompt for Employee ID.');
        $this->command->info('  Original:  EMP-0006');
        $this->command->info('  Duplicate: EMP-TEST-DUPE');
    }
}
