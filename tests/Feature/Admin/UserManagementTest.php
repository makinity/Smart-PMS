<?php

namespace Tests\Feature\Admin;

use App\Mail\PmsEmployeeIdIssuedMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function makeAdminUser(array $overrides = []): User
    {
        Role::findOrCreate('admin', 'web');
        Role::findOrCreate('user', 'web');

        $user = User::forceCreate(array_merge([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'employee_id' => 'EMP-ADMIN-0001',
            'role' => 'admin',
            'is_active' => true,
            'is_disabled' => false,
        ], $overrides));

        if (method_exists($user, 'assignRole')) {
            $user->assignRole('admin');
        }

        return $user;
    }

    public function test_admin_can_create_user_and_send_employee_id_email(): void
    {
        $admin = $this->makeAdminUser();
        $this->actingAs($admin);

        Mail::fake();

        $payload = [
            'employee_id' => 'EMP-2026-00012',
            'name' => 'Maria Santos',
            'email' => 'maria.santos@gmail.com',
            'role' => 'user',
            'office_id' => null,
            'position' => 'Administrative Aide',
            'is_active' => true,
            'is_disabled' => false,
            'send_employee_id' => true,
        ];

        $response = $this->post('/administrator/users', $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('users', [
            'employee_id' => 'EMP-2026-00012',
            'email' => 'maria.santos@gmail.com',
            'role' => 'user',
        ]);

        Mail::assertSent(PmsEmployeeIdIssuedMail::class, function (PmsEmployeeIdIssuedMail $mail) {
            return $mail->hasTo('maria.santos@gmail.com');
        });
    }

    public function test_admin_can_send_employee_id_from_the_directory_action(): void
    {
        $admin = $this->makeAdminUser();
        $user = User::forceCreate([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan.dela.cruz@gmail.com',
            'password' => Hash::make('password'),
            'employee_id' => 'EMP-2026-00013',
            'role' => 'user',
            'is_active' => false,
            'is_disabled' => false,
        ]);

        $this->actingAs($admin);

        Mail::fake();

        $response = $this->post("/administrator/users/{$user->id}/send-code");

        $response->assertRedirect();

        Mail::assertSent(PmsEmployeeIdIssuedMail::class, function (PmsEmployeeIdIssuedMail $mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_last_admin_cannot_be_deactivated(): void
    {
        $admin = $this->makeAdminUser();
        $this->actingAs($admin);

        $response = $this->patch("/administrator/users/{$admin->id}/deactivate");

        $response->assertSessionHasErrors();
        $this->assertDatabaseHas('users', [
            'id' => $admin->id,
            'is_active' => 1,
            'is_disabled' => 0,
        ]);
    }

    public function test_admin_can_change_a_user_role(): void
    {
        $admin = $this->makeAdminUser();
        $user = User::forceCreate([
            'name' => 'Jose Cruz',
            'email' => 'jose.cruz@gmail.com',
            'password' => Hash::make('password'),
            'employee_id' => 'EMP-2026-00014',
            'role' => 'user',
            'is_active' => true,
            'is_disabled' => false,
        ]);

        $this->actingAs($admin);

        $response = $this->patch("/administrator/users/{$user->id}", [
            'employee_id' => $user->employee_id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => 'admin',
            'office_id' => null,
            'position' => null,
            'is_active' => true,
            'is_disabled' => false,
            'send_employee_id' => false,
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'role' => 'admin',
        ]);
    }
}
