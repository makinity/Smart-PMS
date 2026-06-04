<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Office;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            ['name' => 'Human Resource Management Office', 'code' => 'HRMO'],
            ['name' => 'City Budget Office',               'code' => 'CBO'],
        ];

        foreach ($offices as $o) {
            Office::firstOrCreate(['code' => $o['code']], ['name' => $o['name']]);
        }

        $hrmo = Office::where('code', 'HRMO')->first();
        $cbo  = Office::where('code', 'CBO')->first();

        $users = [
            // No office
            ['role' => 'admin',     'name' => 'Admin User',          'email' => 'admin@pms.test',      'office' => null,  'position' => 'System Administrator'],
            ['role' => 'pmt',       'name' => 'PMT User',            'email' => 'pmt@pms.test',        'office' => null,  'position' => 'Planning Officer'],
            // HRMO
            ['role' => 'dept-head', 'name' => 'Maria Santos',        'email' => 'depthead@pms.test',   'office' => $hrmo, 'position' => 'HRMO Department Head'],
            ['role' => 'supervisor','name' => 'Jose Reyes',          'email' => 'supervisor@pms.test', 'office' => $hrmo, 'position' => 'HR Supervisor'],
            ['role' => 'employee',  'name' => 'Ana Dela Cruz',       'email' => 'employee1@pms.test',  'office' => $hrmo, 'position' => 'HR Assistant I'],
            ['role' => 'employee',  'name' => 'Carlos Mendoza',      'email' => 'employee2@pms.test',  'office' => $hrmo, 'position' => 'HR Assistant II'],
            ['role' => 'employee',  'name' => 'Liza Bautista',       'email' => 'employee3@pms.test',  'office' => $hrmo, 'position' => 'Administrative Aide'],
            ['role' => 'employee',  'name' => 'Ramon Villanueva',    'email' => 'employee4@pms.test',  'office' => $hrmo, 'position' => 'Records Officer'],
            // CBO (extra samples for other roles)
            ['role' => 'dept-head', 'name' => 'Patricia Gomez',      'email' => 'depthead2@pms.test',  'office' => $cbo,  'position' => 'CBO Department Head'],
            ['role' => 'supervisor','name' => 'Eduardo Lim',         'email' => 'supervisor2@pms.test','office' => $cbo,  'position' => 'Budget Supervisor'],
            ['role' => 'employee',  'name' => 'Rowena Castro',       'email' => 'employee5@pms.test',  'office' => $cbo,  'position' => 'Budget Analyst'],
        ];

        foreach ($users as $i => $data) {
            $user = User::updateOrCreate(['email' => $data['email']], [
                'name'        => $data['name'],
                'role'        => $data['role'],
                'employee_id' => 'EMP-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'password'    => Hash::make('password'),
                'is_active'   => true,
                'activated_at'=> now(),
                'office_id'   => $data['office']?->id,
                'position'    => $data['position'],
            ]);

            $user->syncRoles($data['role']);
        }

        // Set office heads
        $hrmo->update(['head_id' => User::where('email', 'depthead@pms.test')->value('id')]);
        $cbo->update(['head_id'  => User::where('email', 'depthead2@pms.test')->value('id')]);
    }
}
