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
            ['role' => 'admin',     'name' => 'Admin User',          'email' => 'admin@pms.test',      'office' => null,  'position' => 'System Administrator', 'photo' => '1.jpg'],
            ['role' => 'pmt',       'name' => 'PMT User',            'email' => 'pmt@pms.test',        'office' => null,  'position' => 'Planning Officer',      'photo' => '2.jpg'],
            // HRMO
            ['role' => 'dept-head', 'name' => 'Maria Santos',        'email' => 'depthead@pms.test',   'office' => $hrmo, 'position' => 'HRMO Department Head',  'photo' => '10.jpg'],
            ['role' => 'supervisor','name' => 'Jose Reyes',          'email' => 'supervisor@pms.test', 'office' => $hrmo, 'position' => 'HR Supervisor',         'photo' => '13.jpg'],
            ['role' => 'employee',  'name' => 'Ana Dela Cruz',       'email' => 'employee1@pms.test',  'office' => $hrmo, 'position' => 'HR Assistant I',        'photo' => '8.jpg'],
            ['role' => 'employee',  'name' => 'Carlos Mendoza',      'email' => 'employee2@pms.test',  'office' => $hrmo, 'position' => 'HR Assistant II',       'photo' => '3.jpg'],
            ['role' => 'employee',  'name' => 'Liza Bautista',       'email' => 'employee3@pms.test',  'office' => $hrmo, 'position' => 'Administrative Aide',   'photo' => '14.jpg'],
            ['role' => 'employee',  'name' => 'Ramon Villanueva',    'email' => 'employee4@pms.test',  'office' => $hrmo, 'position' => 'Records Officer',       'photo' => '7.jpg'],
            // CBO
            ['role' => 'dept-head', 'name' => 'Patricia Gomez',      'email' => 'depthead2@pms.test',  'office' => $cbo,  'position' => 'CBO Department Head',   'photo' => '4.jpg'],
            ['role' => 'supervisor','name' => 'Eduardo Lim',         'email' => 'supervisor2@pms.test','office' => $cbo,  'position' => 'Budget Supervisor',     'photo' => '9.jpg'],
            ['role' => 'employee',  'name' => 'Rowena Castro',       'email' => 'employee5@pms.test',  'office' => $cbo,  'position' => 'Budget Analyst',        'photo' => '11.jpg'],
            // Pending activation (test account)
            ['role' => 'employee',  'name' => 'Mark Juntilla',        'email' => 'denjikun1004@gmail.com', 'office' => $hrmo, 'position' => 'HR Staff', 'inactive' => true, 'photo' => 'mark.png'],
        ];

        foreach ($users as $i => $data) {
            $inactive = $data['inactive'] ?? false;
            $user = User::updateOrCreate(['email' => $data['email']], [
                'name'                => $data['name'],
                'role'                => $data['role'],
                'employee_id'         => 'EMP-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'password'            => Hash::make('password'),
                'is_active'           => !$inactive,
                'activated_at'        => $inactive ? null : now(),
                'office_id'           => $data['office']?->id,
                'position'            => $data['position'],
                'profile_photo_path'  => 'sample-user-profile/' . $data['photo'],
            ]);

            $user->syncRoles($data['role']);
        }

        // Set office heads
        $hrmo->update(['head_id' => User::where('email', 'depthead@pms.test')->value('id')]);
        $cbo->update(['head_id'  => User::where('email', 'depthead2@pms.test')->value('id')]);
    }
}
