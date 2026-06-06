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
        private readonly AuditLogService $auditLog,
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
        return DB::transaction(function () use ($data, $actor) {
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

            $this->audit(
                actor: $actor,
                actionKey: 'create',
                target: $user,
                metadata: ['employee_id' => $user->employee_id, 'role' => $user->role]
            );

            return $user;
        });
    }

    public function update(User $user, array $data, User $actor): User
    {
        return DB::transaction(function () use ($user, $data, $actor) {
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

            $this->audit(
                actor: $actor,
                actionKey: 'update',
                target: $user,
                metadata: ['employee_id' => $user->employee_id, 'role' => $user->role]
            );

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

        $this->audit(
            actor: $actor,
            actionKey: 'send_employee_code',
            target: $user,
            metadata: ['email' => $email, 'employee_id' => $user->employee_id]
        );
    }

    public function syncFromHris(string $baseUrl, string $token, User $actor): array
    {
        $summary = $this->hrisSync->sync($baseUrl, $token);

        $this->auditLog->log([
            'actor_user_id' => $actor->id,
            'actor_name' => $actor->name,
            'actor_role' => $actor->role,
            'action_key' => 'sync',
            'module_key' => 'admin.hris',
            'target_type' => 'hris_sync',
            'target_id' => null,
            'route_name' => request()?->route()?->getName(),
            'http_method' => request()?->method(),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'status' => 'success',
            'summary' => 'Successful sync in Admin Hris',
            'metadata' => $summary,
        ]);

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

        $this->audit(
            actor: $actor,
            actionKey: $active ? 'activate' : 'deactivate',
            target: $user,
            metadata: ['employee_id' => $user->employee_id]
        );

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

        $this->audit(
            actor: $actor,
            actionKey: $disabled ? 'disable' : 'enable',
            target: $user,
            metadata: ['employee_id' => $user->employee_id]
        );

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

    private function audit(User $actor, string $actionKey, ?User $target = null, array $metadata = [], string $moduleKey = 'admin.users'): void
    {
        $this->auditLog->log([
            'actor_user_id' => $actor->id,
            'actor_name' => $actor->name,
            'actor_role' => $actor->role,
            'action_key' => $actionKey,
            'module_key' => $moduleKey,
            'target_type' => $target ? 'user' : null,
            'target_id' => $target ? (string) $target->id : null,
            'route_name' => request()?->route()?->getName(),
            'http_method' => request()?->method(),
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
            'status' => 'success',
            'summary' => $this->buildSummary($actionKey, $target),
            'metadata' => array_filter($metadata, static fn ($value) => $value !== null && $value !== ''),
        ]);
    }

    private function buildSummary(string $actionKey, ?User $target): string
    {
        $actionLabel = Str::title(str_replace('_', ' ', $actionKey));
        $summary = "Successful {$actionLabel} in Admin Users";

        if ($target) {
            $summary .= " (user: {$target->id})";
        }

        return $summary;
    }

    private function normalizeEmail(mixed $email): string
    {
        return Str::lower(trim((string) $email));
    }
}
