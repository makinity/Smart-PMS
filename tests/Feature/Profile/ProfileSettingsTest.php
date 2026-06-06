<?php

namespace Tests\Feature\Profile;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_pages_render_for_each_role_without_placeholder_copy(): void
    {
        $cases = [
            'admin' => '/administrator/profile',
            'pmt' => '/pmt/profile',
            'dept-head' => '/dept-head/profile',
            'supervisor' => '/supervisor/profile',
            'employee' => '/employee/profile',
        ];

        foreach ($cases as $role => $uri) {
            $user = $this->makeRoleUser($role);

            $this->actingAs($user)
                ->get($uri)
                ->assertOk()
                ->assertSee('Profile')
                ->assertDontSee('under construction');
        }
    }

    public function test_user_can_update_profile_information_with_photo(): void
    {
        Storage::fake('public');

        $user = $this->makeRoleUser('employee');

        $response = $this->actingAs($user)->put('/user/profile-information', [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'profile_photo' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

        $response->assertRedirect();

        $fresh = $user->fresh();

        $this->assertSame('Updated Name', $fresh->name);
        $this->assertSame('updated@example.com', $fresh->email);
        $this->assertNotNull($fresh->profile_photo_path);
        Storage::disk('public')->assertExists($fresh->profile_photo_path);
    }

    public function test_user_can_update_password_with_current_password(): void
    {
        $user = $this->makeRoleUser('employee');

        $response = $this->actingAs($user)->put('/user/password', [
            'current_password' => 'password',
            'password' => 'NewPassword#2026',
            'password_confirmation' => 'NewPassword#2026',
        ]);

        $response->assertRedirect();

        $this->assertTrue(Hash::check('NewPassword#2026', $user->fresh()->password));
    }

    private function makeRoleUser(string $role): User
    {
        Role::findOrCreate($role, 'web');

        $user = User::factory()->create([
            'name' => ucfirst(str_replace('-', ' ', $role)).' User',
            'email' => $role.'@example.com',
            'password' => Hash::make('password'),
            'role' => $role,
            'employee_id' => 'EMP-TEST-'.strtoupper(str_replace('-', '', $role)),
            'is_active' => true,
            'is_disabled' => false,
        ]);

        $user->syncRoles([$role]);

        return $user;
    }
}
