<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        // Eager-load employee + office once per request to avoid N+1 queries.
        // All $user->employee_id, $user->office_id etc. delegate to this loaded relation.
        if ($user) {
            $user->loadMissing('employee.office');
        }

        $employee = $user?->employee;

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id'                => $user->id,
                    'name'              => $user->name,
                    'email'             => $user->email,
                    'employee_id'       => $employee?->employee_id,
                    'role'              => $user->role,
                    'roles'             => $user->getRoleNames(),
                    'office_id'         => $employee?->office_id,
                    'office_name'       => $employee?->office?->name,
                    'position'          => $employee?->position,
                    'is_active'         => (bool) ($employee?->is_active ?? false),
                    'is_disabled'       => (bool) ($employee?->is_disabled ?? false),
                    'activated_at'      => $employee?->activated_at?->toISOString(),
                    'profile_photo_url' => $employee?->profile_photo_url
                        ?? \Illuminate\Support\Facades\Storage::url('profiles/default.jpeg'),
                    'avatar'            => $employee?->profile_photo_url
                        ?? \Illuminate\Support\Facades\Storage::url('profiles/default.jpeg'),
                ] : null,
            ],
            'flash' => [
                'success'        => $request->session()->get('success'),
                'error'          => $request->session()->get('error'),
                'summary'        => $request->session()->get('summary'),
                'just_logged_in' => $request->session()->get('just_logged_in', false),
            ],
            'ziggy' => fn () => cache()->remember('ziggy.routes.v1', 3600, fn () => (new Ziggy)->toArray()),
        ]);
    }
}
