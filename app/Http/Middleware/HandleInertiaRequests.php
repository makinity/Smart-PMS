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
        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $request->user() ? [
                    'id'                 => $request->user()->id,
                    'name'               => $request->user()->name,
                    'email'              => $request->user()->email,
                    'employee_id'        => $request->user()->employee_id,
                    'role'               => $request->user()->role,
                    'roles'              => $request->user()->getRoleNames(),
                    'office_id'          => $request->user()->office_id,
                    'office_name'        => $request->user()->office?->name,
                    'position'           => $request->user()->position,
                    'is_active'          => $request->user()->is_active,
                    'is_disabled'        => $request->user()->is_disabled,
                    'activated_at'       => $request->user()->activated_at?->toISOString(),
                    'profile_photo_url'  => $request->user()->profile_photo_url,
                    'avatar'             => $request->user()->profile_photo_url,
                ] : null,
            ],
            'flash' => [
                'success'       => $request->session()->get('success'),
                'error'         => $request->session()->get('error'),
                'summary'       => $request->session()->get('summary'),
                'just_logged_in'=> $request->session()->get('just_logged_in', false),
            ],
            'ziggy' => fn () => (new Ziggy)->toArray(),
        ]);
    }
}
