<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class ProductionSeeder extends Seeder
{

    public function run(): void
    {
        foreach (['admin', 'pmt', 'dept-head', 'supervisor', 'employee'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        $user = User::updateOrCreate(
            ['email' => 'markjuntillava@gmail.com'],
            [
                'name'              => 'System Administrator',
                'role'              => 'admin',
                'password'          => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        $user->syncRoles(['admin']);

        Employee::updateOrCreate(
            ['user_id' => $user->id],
            [
                'pms_id'             => 'ADM-00001',
                'first_name'         => 'Mark Vencent',
                'middle_name'        => 'Liones',
                'last_name'          => 'Juntilla',
                'office_id'          => null,
                'position'           => 'System Administrator',
                'is_active'          => true,
                'activated_at'       => now(),
                'profile_photo_path' => null,
            ]
        );
    }
}
