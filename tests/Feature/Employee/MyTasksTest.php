<?php

namespace Tests\Feature\Employee;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class MyTasksTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_my_tasks_page_renders_with_empty_state_when_no_active_period_exists(): void
    {
        Role::findOrCreate('employee', 'web');

        $user = User::factory()->create([
            'name' => 'Employee User',
            'email' => 'employee@example.com',
            'role' => 'employee',
        ]);

        $user->assignRole('employee');

        $this->actingAs($user)
            ->get('/employee/my-tasks')
            ->assertOk()
            ->assertSee('No active performance period is currently available.');
    }
}
