<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Office;
use App\Models\User;
use App\Services\AdminUserManagementService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UsersController extends Controller
{
    public function index(Request $request, AdminUserManagementService $service)
    {
        $filters = $request->only(['search', 'role', 'status', 'office']);

        $usersQuery = User::query()
            ->with(['office:id,name,code'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $term = trim((string) $search);
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('employee_id', 'like', "%{$term}%")
                        ->orWhere('position', 'like', "%{$term}%")
                        ->orWhereHas('office', function ($officeQuery) use ($term) {
                            $officeQuery->where('name', 'like', "%{$term}%")
                                ->orWhere('code', 'like', "%{$term}%");
                        });
                });
            })
            ->when($filters['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->when($filters['office'] ?? null, fn ($query, $officeId) => $query->where('office_id', $officeId))
            ->when($filters['status'] ?? null, function ($query, $status) {
                return match ($status) {
                    'active' => $query->where('is_active', true)->where('is_disabled', false),
                    'inactive' => $query->where('is_active', false)->where('is_disabled', false)->whereNotNull('activated_at'),
                    'pending' => $query->whereNull('activated_at')->where('is_disabled', false),
                    'disabled' => $query->where('is_disabled', true),
                    default => $query,
                };
            })
            ->orderBy('name');

        $users = $usersQuery
            ->paginate(12)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'name' => $user->name,
                'avatar' => $user->profile_photo_url,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => $this->roleLabel($user->role),
                'office' => $user->office ? [
                    'id' => $user->office->id,
                    'name' => $user->office->name,
                    'code' => $user->office->code,
                ] : null,
                'position' => $user->position,
                'is_active' => (bool) $user->is_active,
                'is_disabled' => (bool) $user->is_disabled,
                'activated_at' => $user->activated_at?->toDateTimeString(),
                'status' => $this->statusFor($user),
                'status_label' => $this->statusLabelFor($user),
                'initials' => $user->initials,
                'roles' => $user->getRoleNames()->values()->all(),
                'created_at' => $user->created_at?->format('M d, Y'),
                'updated_at' => $user->updated_at?->format('M d, Y h:i A'),
                'can_send_code' => filled($user->email),
            ]);

        $activeAdminCount = User::query()
            ->where('role', 'admin')
            ->where('is_disabled', false)
            ->count();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'roles' => $service->availableRoles(),
            'offices' => Office::query()->orderBy('name')->get(['id', 'name', 'code']),
            'filters' => $filters,
            'stats' => [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->where('is_disabled', false)->count(),
                'pending_users' => User::whereNull('activated_at')->where('is_disabled', false)->count(),
                'disabled_users' => User::where('is_disabled', true)->count(),
                'admin_users' => User::where('role', 'admin')->count(),
            ],
            'safety' => [
                'active_admin_count' => $activeAdminCount,
                'last_admin_protected' => true,
            ],
        ]);
    }

    public function store(Request $request, AdminUserManagementService $service)
    {
        $data = $this->validatePayload($request);
        $user = $service->create($data, $request->user());

        if ($request->boolean('send_employee_id')) {
            $service->sendEmployeeId($user, $request->user());
        }

        return back()->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user, AdminUserManagementService $service)
    {
        $data = $this->validatePayload($request, $user);
        $service->update($user, $data, $request->user());

        if ($request->boolean('send_employee_id')) {
            $service->sendEmployeeId($user, $request->user());
        }

        return back()->with('success', 'User updated successfully.');
    }

    public function sendCode(Request $request, User $user, AdminUserManagementService $service)
    {
        $service->sendEmployeeId($user, $request->user());

        return back()->with('success', 'Employee ID email sent successfully.');
    }

    public function activate(Request $request, User $user, AdminUserManagementService $service)
    {
        $service->activate($user, $request->user());

        return back()->with('success', 'User activated successfully.');
    }

    public function deactivate(Request $request, User $user, AdminUserManagementService $service)
    {
        $service->deactivate($user, $request->user());

        return back()->with('success', 'User deactivated successfully.');
    }

    public function disable(Request $request, User $user, AdminUserManagementService $service)
    {
        $service->disable($user, $request->user());

        return back()->with('success', 'User disabled successfully.');
    }

    public function enable(Request $request, User $user, AdminUserManagementService $service)
    {
        $service->enable($user, $request->user());

        return back()->with('success', 'User enabled successfully.');
    }

    private function validatePayload(Request $request, ?User $user = null): array
    {
        $roles = Role::query()->where('guard_name', 'web')->pluck('name')->all();

        return $request->validate([
            'employee_id' => [
                'required',
                'string',
                'max:50',
                Rule::unique('users', 'employee_id')->ignore($user?->id),
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'role' => ['required', Rule::in($roles)],
            'office_id' => ['nullable', 'exists:offices,id'],
            'position' => ['nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'is_disabled' => ['nullable', 'boolean'],
            'send_employee_id' => ['nullable', 'boolean'],
        ]);
    }

    private function roleLabel(?string $role): string
    {
        return match ($role) {
            'admin' => 'Admin',
            'pmt' => 'PMT',
            'dept-head' => 'Dept. Head',
            'supervisor' => 'Supervisor',
            'employee' => 'Employee',
            default => ucfirst((string) $role),
        };
    }

    private function statusFor(User $user): string
    {
        if ($user->is_disabled) {
            return 'disabled';
        }

        if (! $user->is_active) {
            return $user->activated_at ? 'inactive' : 'pending';
        }

        return 'active';
    }

    private function statusLabelFor(User $user): string
    {
        return match ($this->statusFor($user)) {
            'active' => 'Active',
            'inactive' => 'Inactive',
            'disabled' => 'Disabled',
            default => 'Pending',
        };
    }
}
