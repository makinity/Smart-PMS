<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Office;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // ── Offices ───────────────────────────────────────────────────────────
        $officeData = [
            ['name' => 'Human Resource Management Office', 'code' => 'HRMO'],
            ['name' => 'City Budget Office',               'code' => 'CBO'],
        ];

        foreach ($officeData as $o) {
            Office::firstOrCreate(['code' => $o['code']], ['name' => $o['name']]);
        }

        $hrmo = Office::where('code', 'HRMO')->first();
        $cbo  = Office::where('code', 'CBO')->first();

        // ── User + Employee definitions ───────────────────────────────────────
        $users = [
            // No office
            ['role' => 'admin',      'name' => 'Admin User',       'first_name' => 'Admin',    'last_name' => 'User',       'middle_name' => null, 'email' => 'admin@pms.test',          'office' => null,  'position' => 'System Administrator',  'photo' => '1.jpg'],
            ['role' => 'pmt',        'name' => 'PMT User',         'first_name' => 'PMT',      'last_name' => 'User',       'middle_name' => null, 'email' => 'pmt@pms.test',            'office' => null,  'position' => 'Planning Officer',       'photo' => '2.jpg'],
            // HRMO
            ['role' => 'dept-head',  'name' => 'Maria Santos',     'first_name' => 'Maria',    'last_name' => 'Santos',     'middle_name' => null, 'email' => 'depthead@pms.test',       'office' => $hrmo, 'position' => 'HRMO Department Head',   'photo' => '10.jpg'],
            ['role' => 'supervisor', 'name' => 'Jose Reyes',       'first_name' => 'Jose',     'last_name' => 'Reyes',      'middle_name' => null, 'email' => 'supervisor@pms.test',     'office' => $hrmo, 'position' => 'HR Supervisor',          'photo' => '13.jpg'],
            ['role' => 'employee',   'name' => 'Ana Dela Cruz',    'first_name' => 'Ana',      'last_name' => 'Dela Cruz',  'middle_name' => null, 'email' => 'employee1@pms.test',      'office' => $hrmo, 'position' => 'HR Assistant I',         'photo' => '8.jpg'],
            ['role' => 'employee',   'name' => 'Carlos Mendoza',   'first_name' => 'Carlos',   'last_name' => 'Mendoza',    'middle_name' => null, 'email' => 'employee2@pms.test',      'office' => $hrmo, 'position' => 'HR Assistant II',        'photo' => '3.jpg'],
            ['role' => 'employee',   'name' => 'Liza Bautista',    'first_name' => 'Liza',     'last_name' => 'Bautista',   'middle_name' => null, 'email' => 'employee3@pms.test',      'office' => $hrmo, 'position' => 'Administrative Aide',    'photo' => '14.jpg'],
            ['role' => 'employee',   'name' => 'Ramon Villanueva', 'first_name' => 'Ramon',    'last_name' => 'Villanueva', 'middle_name' => null, 'email' => 'employee4@pms.test',      'office' => $hrmo, 'position' => 'Records Officer',        'photo' => '7.jpg'],
            // CBO
            ['role' => 'dept-head',  'name' => 'Patricia Gomez',   'first_name' => 'Patricia', 'last_name' => 'Gomez',      'middle_name' => null, 'email' => 'depthead2@pms.test',      'office' => $cbo,  'position' => 'CBO Department Head',    'photo' => '4.jpg'],
            ['role' => 'supervisor', 'name' => 'Eduardo Lim',      'first_name' => 'Eduardo',  'last_name' => 'Lim',        'middle_name' => null, 'email' => 'supervisor2@pms.test',    'office' => $cbo,  'position' => 'Budget Supervisor',      'photo' => '9.jpg'],
            ['role' => 'employee',   'name' => 'Rowena Castro',    'first_name' => 'Rowena',   'last_name' => 'Castro',     'middle_name' => null, 'email' => 'employee5@pms.test',      'office' => $cbo,  'position' => 'Budget Analyst',         'photo' => '11.jpg'],
            // Pending activation (test account)
            ['role' => 'employee',   'name' => 'Mark Juntilla',    'first_name' => 'Mark',     'last_name' => 'Juntilla',   'middle_name' => null, 'email' => 'denjikun1004@gmail.com',  'office' => $hrmo, 'position' => 'HR Staff',               'photo' => 'mark.png', 'inactive' => true],
        ];

        foreach ($users as $i => $data) {
            $inactive = $data['inactive'] ?? false;

            // ── 1. Create / update the User (auth fields only) ────────────────
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name'     => $data['name'],
                    'role'     => $data['role'],
                    'password' => Hash::make('password'),
                ]
            );

            $user->syncRoles($data['role']);

            // ── 2. Create / update the Employee (HR fields) ───────────────────
            Employee::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'employee_id'        => 'EMP-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                    'first_name'         => $data['first_name'] ?? null,
                    'middle_name'        => $data['middle_name'] ?? null,
                    'last_name'          => $data['last_name'] ?? null,
                    'office_id'          => $data['office']?->id,
                    'position'           => $data['position'],
                    'is_active'          => ! $inactive,
                    'activated_at'       => $inactive ? null : now(),
                    'profile_photo_path' => 'sample-user-profile/' . $data['photo'],
                ]
            );
        }

        // ── Set office heads ─────────────────────────────────────────────────
        $hrmo->update(['head_id' => User::where('email', 'depthead@pms.test')->value('id')]);
        $cbo->update(['head_id'  => User::where('email', 'depthead2@pms.test')->value('id')]);
    }
}
