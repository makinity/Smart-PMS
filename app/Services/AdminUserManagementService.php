<?php

namespace App\Services;

use App\Mail\PmsEmployeeIdIssuedMail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AdminUserManagementService
{
    public function __construct(
        private readonly HmsEmployeeSyncService $hrisSync,
    ) {}

    public function availableRoles(): array
    {
        return Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->pluck('name')
            ->values()
            ->all();
    }

    public function create(array $data, User $actor): User
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'employee_id' => trim((string) $data['employee_id']),
                'name' => trim((string) $data['name']),
                'email' => $this->normalizeEmail($data['email'] ?? null),
                'password' => Hash::make(Str::random(48)),
                'role' => $data['role'],
                'is_active' => (bool) ($data['is_active'] ?? false),
                'activated_at' => ! empty($data['is_active']) ? now() : null,
                'is_disabled' => (bool) ($data['is_disabled'] ?? false),
                'office_id' => ! empty($data['office_id']) ? $data['office_id'] : null,
                'position' => trim((string) ($data['position'] ?? '')) ?: null,
            ]);

            $this->syncRole($user, $data['role']);
            $user->load('office');

            return $user;
        });
    }

    public function update(User $user, array $data, User $actor): User
    {
        return DB::transaction(function () use ($user, $data) {
            $nextRole = $data['role'] ?? $user->role;
            $nextDisabled = array_key_exists('is_disabled', $data)
                ? (bool) $data['is_disabled']
                : (bool) $user->is_disabled;
            $nextActive = array_key_exists('is_active', $data)
                ? (bool) $data['is_active']
                : (bool) $user->is_active;

            $this->assertAdminSafety($user, (string) $nextRole, $nextDisabled, $nextActive);

            $user->fill([
                'employee_id' => trim((string) ($data['employee_id'] ?? $user->employee_id)),
                'name' => trim((string) ($data['name'] ?? $user->name)),
                'email' => $this->normalizeEmail($data['email'] ?? $user->email),
                'role' => $nextRole,
                'is_active' => $nextActive,
                'activated_at' => array_key_exists('is_active', $data)
                    ? ($nextActive ? ($user->activated_at ?? now()) : null)
                    : $user->activated_at,
                'is_disabled' => $nextDisabled,
                'office_id' => array_key_exists('office_id', $data)
                    ? (! empty($data['office_id']) ? $data['office_id'] : null)
                    : $user->office_id,
                'position' => array_key_exists('position', $data)
                    ? (trim((string) $data['position']) ?: null)
                    : $user->position,
            ]);
            $user->save();
            $this->syncRole($user, $nextRole);
            $user->load('office');

            return $user;
        });
    }

    public function activate(User $user, User $actor): User
    {
        return $this->setActive($user, true, $actor);
    }

    public function deactivate(User $user, User $actor): User
    {
        return $this->setActive($user, false, $actor);
    }

    public function enable(User $user, User $actor): User
    {
        return $this->setDisabled($user, false, $actor);
    }

    public function disable(User $user, User $actor): User
    {
        return $this->setDisabled($user, true, $actor);
    }

    public function sendEmployeeId(User $user, User $actor): void
    {
        $email = $this->normalizeEmail($user->email);
        if ($email === '') {
            throw ValidationException::withMessages([
                'email' => 'The user must have an email address before the employee ID can be sent.',
            ]);
        }

        Mail::to($email)->send(new PmsEmployeeIdIssuedMail(
            name: $user->name,
            employeeId: (string) $user->employee_id,
            email: $email,
        ));

        activity('User')
            ->performedOn($user)
            ->causedBy($actor)
            ->withProperties(['email' => $email, 'employee_id' => $user->employee_id])
            ->event('sent_employee_id')
            ->log('Sent employee ID');
    }

    public function syncFromHris(string $baseUrl, string $token, User $actor): array
    {
        $summary = $this->hrisSync->sync($baseUrl, $token);

        activity('Hris')
            ->causedBy($actor)
            ->withProperties($summary)
            ->event('hris_sync')
            ->log('Synced users from HRIS');

        return $summary;
    }

    private function setActive(User $user, bool $active, User $actor): User
    {
        if (! $active) {
            $this->assertAdminSafety($user, $user->role, (bool) $user->is_disabled, $active);
        }

        $user->forceFill([
            'is_active' => $active,
            'activated_at' => $active ? ($user->activated_at ?? now()) : null,
        ])->save();

        return $user->fresh('office');
    }

    private function setDisabled(User $user, bool $disabled, User $actor): User
    {
        if ($disabled) {
            $this->assertAdminSafety($user, $user->role, true, (bool) $user->is_active);
        }

        $user->forceFill([
            'is_disabled' => $disabled,
        ])->save();

        return $user->fresh('office');
    }

    private function assertAdminSafety(User $target, string $nextRole, bool $nextDisabled, ?bool $nextActive = null): void
    {
        if ($target->role !== 'admin') {
            return;
        }

        $wouldRemainAdmin = $nextRole === 'admin' && ! $nextDisabled && ($nextActive ?? (bool) $target->is_active);
        if ($wouldRemainAdmin) {
            return;
        }

        $otherAdminCount = User::query()
            ->where('role', 'admin')
            ->where('is_disabled', false)
            ->where('is_active', true)
            ->where('id', '!=', $target->id)
            ->count();

        if ($otherAdminCount < 1) {
            throw ValidationException::withMessages([
                'role' => 'At least one active admin must remain in the system.',
            ]);
        }
    }

    private function syncRole(User $user, string $role): void
    {
        Role::findOrCreate($role, 'web');
        $user->syncRoles([$role]);
    }

    private function normalizeEmail(mixed $email): string
    {
        return Str::lower(trim((string) $email));
    }
}
