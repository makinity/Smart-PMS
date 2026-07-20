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
            ->with(['employee.office'])
            ->when($filters['search'] ?? null, function ($query, $search) {
                $term = trim((string) $search);
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhereHas('employee', function ($eq) use ($term) {
                            $eq->where('employee_id', 'like', "%{$term}%")
                                ->orWhere('position', 'like', "%{$term}%")
                                ->orWhereHas('office', function ($oq) use ($term) {
                                    $oq->where('name', 'like', "%{$term}%")
                                        ->orWhere('code', 'like', "%{$term}%");
                                });
                        });
                });
            })
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
            ->when($filters['office'] ?? null, fn ($q, $officeId) => $q->whereHas('employee', fn ($eq) => $eq->where('office_id', $officeId)))
            ->when($filters['status'] ?? null, function ($query, $status) {
                return match ($status) {
                    'active'   => $query->whereHas('employee', fn ($q) => $q->where('is_active', true)->where('is_disabled', false)),
                    'inactive' => $query->whereHas('employee', fn ($q) => $q->where('is_active', false)->where('is_disabled', false)->whereNotNull('activated_at')),
                    'pending'  => $query->whereHas('employee', fn ($q) => $q->whereNull('activated_at')->where('is_disabled', false)),
                    'disabled' => $query->whereHas('employee', fn ($q) => $q->where('is_disabled', true)),
                    default    => $query,
                };
            })
            ->orderBy('name');

        $users = $usersQuery
            ->paginate(12)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id'           => $user->id,
                'employee_id'  => $user->employee?->employee_id,
                'name'         => $user->name,
                'first_name'   => $user->employee?->first_name,
                'middle_name'  => $user->employee?->middle_name,
                'last_name'    => $user->employee?->last_name,
                'full_name'    => $user->employee?->full_name,
                'avatar'       => $user->employee?->profile_photo_url ?? \Illuminate\Support\Facades\Storage::url('profiles/default.jpeg'),
                'email'        => $user->email,
                'role'         => $user->role,
                'role_label'   => $this->roleLabel($user->role),
                'office'       => $user->employee?->office ? [
                    'id'   => $user->employee->office->id,
                    'name' => $user->employee->office->name,
                    'code' => $user->employee->office->code,
                ] : null,
                'position'     => $user->employee?->position,
                'is_active'    => (bool) ($user->employee?->is_active ?? false),
                'is_disabled'  => (bool) ($user->employee?->is_disabled ?? false),
                'activated_at' => $user->employee?->activated_at?->toDateTimeString(),
                'status'       => $this->statusFor($user),
                'status_label' => $this->statusLabelFor($user),
                'initials'     => $user->initials,
                'roles'        => $user->getRoleNames()->values()->all(),
                'created_at'   => $user->created_at?->format('M d, Y'),
                'updated_at'   => $user->updated_at?->format('M d, Y h:i A'),
                'can_send_code'=> filled($user->email),
            ]);

        $activeAdminCount = User::query()
            ->where('role', 'admin')
            ->whereHas('employee', fn ($q) => $q->where('is_disabled', false))
            ->count();

        return Inertia::render('Admin/Users/Index', [
            'users'   => $users,
            'roles'   => $service->availableRoles(),
            'offices' => Office::query()->orderBy('name')->get(['id', 'name', 'code']),
            'filters' => $filters,
            'stats'   => [
                'total_users'    => User::count(),
                'active_users'   => User::whereHas('employee', fn ($q) => $q->where('is_active', true)->where('is_disabled', false))->count(),
                'pending_users'  => User::whereHas('employee', fn ($q) => $q->whereNull('activated_at')->where('is_disabled', false))->count(),
                'disabled_users' => User::whereHas('employee', fn ($q) => $q->where('is_disabled', true))->count(),
                'admin_users'    => User::where('role', 'admin')->count(),
            ],
            'safety' => [
                'active_admin_count'    => $activeAdminCount,
                'last_admin_protected'  => true,
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
        return back();
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

        // employee_id uniqueness now validated against employees table
        $employeeId = $user?->employee?->id;

        return $request->validate([
            'employee_id' => [
                'required',
                'string',
                'max:50',
                Rule::unique('employees', 'employee_id')->ignore($employeeId),
            ],
            'name'             => ['required', 'string', 'max:255'],
            'first_name'       => ['nullable', 'string', 'max:100'],
            'middle_name'      => ['nullable', 'string', 'max:100'],
            'last_name'        => ['nullable', 'string', 'max:100'],
            'email'            => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'role'             => ['required', Rule::in($roles)],
            'office_id'        => ['nullable', 'exists:offices,id'],
            'position'         => ['nullable', 'string', 'max:255'],
            'is_active'        => ['nullable', 'boolean'],
            'is_disabled'      => ['nullable', 'boolean'],
            'send_employee_id' => ['nullable', 'boolean'],
        ]);
    }

    private function roleLabel(?string $role): string
    {
        return match ($role) {
            'admin'      => 'Admin',
            'pmt'        => 'PMT',
            'dept-head'  => 'Dept. Head',
            'supervisor' => 'Supervisor',
            'employee'   => 'Employee',
            default      => ucfirst((string) $role),
        };
    }

    private function statusFor(User $user): string
    {
        $emp = $user->employee;
        if ($emp?->is_disabled) return 'disabled';
        if (! ($emp?->is_active ?? false)) return $emp?->activated_at ? 'inactive' : 'pending';
        return 'active';
    }

    private function statusLabelFor(User $user): string
    {
        return match ($this->statusFor($user)) {
            'active'   => 'Active',
            'inactive' => 'Inactive',
            'disabled' => 'Disabled',
            default    => 'Pending',
        };
    }
}
