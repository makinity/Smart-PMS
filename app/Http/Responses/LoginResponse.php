<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $request->session()->flash('just_logged_in', true);

        $user = $request->user();

        if ($user) {
            $user->loadMissing('employee');
        }

        // If this employee is currently locked for L&D training,
        // redirect them to the L&D website immediately on login.
        if ($user && ($user->employee?->training_locked ?? false)) {
            $lndBase = rtrim((string) config('services.lnd.base_url', ''), '/');

            if (! empty($lndBase)) {
                $params = [
                    'pms_user_id' => $user->id,
                    'plan'        => $user->employee?->lnd_reference_id ?? '',
                ];

                $secret = config('services.lnd.redirect_hmac_secret', '');
                if (! empty($secret)) {
                    $params['sig'] = hash_hmac(
                        'sha256',
                        $params['pms_user_id'] . $params['plan'],
                        $secret
                    );
                }

                $redirectUrl = $lndBase . '/intake?' . http_build_query($params);

                // Use Inertia::location() for a full browser redirect
                // (avoids CORS error from Inertia's XHR intercepting redirect()->away())
                return \Inertia\Inertia::location($redirectUrl);
            }

            // L&D URL not configured — redirect to the styled Inertia error page
            // instead of a raw abort(403).
            return \Inertia\Inertia::location(
                route('pillar.disconnected', ['pillar' => 'ld'])
            );
        }

        return redirect()->intended('/dashboard');
    }
}
