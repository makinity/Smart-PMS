<?php

namespace App\Services;

use App\Mail\PmsEmployeeIdIssuedMail;
use App\Models\Employee;
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
            // ── 1. Create auth record (users table) ───────────────────────────
            $user = User::create([
                'name'     => trim((string) $data['name']),
                'email'    => $this->normalizeEmail($data['email'] ?? null),
                'password' => Hash::make(Str::random(48)),
                'role'     => $data['role'],
            ]);

            // ── 2. Create employee record (employees table) ───────────────────
            $isActive = (bool) ($data['is_active'] ?? false);
            Employee::create([
                'user_id'     => $user->id,
                'employee_id' => trim((string) $data['employee_id']),
                'first_name'  => trim((string) ($data['first_name'] ?? '')) ?: null,
                'middle_name' => trim((string) ($data['middle_name'] ?? '')) ?: null,
                'last_name'   => trim((string) ($data['last_name'] ?? '')) ?: null,
                'office_id'   => ! empty($data['office_id']) ? $data['office_id'] : null,
                'position'    => trim((string) ($data['position'] ?? '')) ?: null,
                'is_active'   => $isActive,
                'activated_at'=> $isActive ? now() : null,
                'is_disabled' => (bool) ($data['is_disabled'] ?? false),
            ]);

            $this->syncRole($user, $data['role']);
            $user->load('employee.office');

            return $user;
        });
    }

    public function update(User $user, array $data, User $actor): User
    {
        return DB::transaction(function () use ($user, $data) {
            $employee = $user->employee ?? Employee::create(['user_id' => $user->id]);

            $nextRole     = $data['role'] ?? $user->role;
            $nextDisabled = array_key_exists('is_disabled', $data)
                ? (bool) $data['is_disabled']
                : (bool) $employee->is_disabled;
            $nextActive   = array_key_exists('is_active', $data)
                ? (bool) $data['is_active']
                : (bool) $employee->is_active;

            $this->assertAdminSafety($user, $employee, (string) $nextRole, $nextDisabled, $nextActive);

            // ── Update users table (auth fields) ──────────────────────────────
            $user->fill([
                'name'  => trim((string) ($data['name'] ?? $user->name)),
                'email' => $this->normalizeEmail($data['email'] ?? $user->email),
                'role'  => $nextRole,
            ]);
            $user->save();

            // ── Update employees table (HR fields) ────────────────────────────
            $employee->fill([
                'employee_id' => trim((string) ($data['employee_id'] ?? $employee->employee_id)),
                'first_name'  => array_key_exists('first_name', $data)
                    ? (trim((string) $data['first_name']) ?: null)
                    : $employee->first_name,
                'middle_name' => array_key_exists('middle_name', $data)
                    ? (trim((string) $data['middle_name']) ?: null)
                    : $employee->middle_name,
                'last_name'   => array_key_exists('last_name', $data)
                    ? (trim((string) $data['last_name']) ?: null)
                    : $employee->last_name,
                'is_active'   => $nextActive,
                'activated_at'=> array_key_exists('is_active', $data)
                    ? ($nextActive ? ($employee->activated_at ?? now()) : null)
                    : $employee->activated_at,
                'is_disabled' => $nextDisabled,
                'office_id'   => array_key_exists('office_id', $data)
                    ? (! empty($data['office_id']) ? $data['office_id'] : null)
                    : $employee->office_id,
                'position'    => array_key_exists('position', $data)
                    ? (trim((string) $data['position']) ?: null)
                    : $employee->position,
            ]);
            $employee->save();

            $this->syncRole($user, $nextRole);
            $user->load('employee.office');

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

        $employeeId = (string) ($user->employee?->employee_id ?? '');

        Mail::to($email)->send(new PmsEmployeeIdIssuedMail(
            name: $user->name,
            employeeId: $employeeId,
            email: $email,
        ));

        activity('User')
            ->performedOn($user)
            ->causedBy($actor)
            ->withProperties(['email' => $email, 'employee_id' => $employeeId])
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

    // ── Private helpers ──────────────────────────────────────────────────────

    private function setActive(User $user, bool $active, User $actor): User
    {
        $employee = $user->employee ?? Employee::create(['user_id' => $user->id]);

        if (! $active) {
            $this->assertAdminSafety($user, $employee, $user->role, (bool) $employee->is_disabled, $active);
        }

        $employee->forceFill([
            'is_active'    => $active,
            'activated_at' => $active ? ($employee->activated_at ?? now()) : null,
        ])->save();

        return $user->fresh('employee.office');
    }

    private function setDisabled(User $user, bool $disabled, User $actor): User
    {
        $employee = $user->employee ?? Employee::create(['user_id' => $user->id]);

        if ($disabled) {
            $this->assertAdminSafety($user, $employee, $user->role, true, (bool) $employee->is_active);
        }

        $employee->forceFill(['is_disabled' => $disabled])->save();

        return $user->fresh('employee.office');
    }

    private function assertAdminSafety(
        User $target,
        Employee $employee,
        string $nextRole,
        bool $nextDisabled,
        ?bool $nextActive = null,
    ): void {
        if ($target->role !== 'admin') {
            return;
        }

        $wouldRemainAdmin = $nextRole === 'admin'
            && ! $nextDisabled
            && ($nextActive ?? (bool) $employee->is_active);

        if ($wouldRemainAdmin) {
            return;
        }

        // Count other active admins using the employees join
        $otherAdminCount = User::query()
            ->where('role', 'admin')
            ->where('id', '!=', $target->id)
            ->whereHas('employee', fn ($q) => $q->where('is_disabled', false)->where('is_active', true))
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
