<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfTrainingLocked
{
    /**
     * Redirect employees who are under L&D training to the L&D website.
     *
     * This middleware is applied after auth — if the logged-in user has
     * training_locked = true, they cannot access PMS and are redirected
     * to the L&D website with their identity in the URL.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $user->loadMissing('employee');
        }

        if (! $user || ! ($user->employee?->training_locked ?? false)) {
            return $next($request);
        }

        // Skip API requests — let the API return 403 instead
        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Your account is currently under L&D training.',
            ], 403);
        }

        // Read L&D base URL from Hub connection (authoritative) or fall back to .env
        $hubConnection = \App\Models\HrmoHubConnection::where('pillar', 'ld')
            ->where('status', \App\Models\HrmoHubConnection::STATUS_CONNECTED)
            ->first();

        $lndBase = rtrim((string) ($hubConnection?->base_url ?: config('services.lnd.base_url', '')), '/');

        if (empty($lndBase)) {
            // L&D URL not configured — show a friendly page instead of redirecting nowhere
            abort(403, 'Your account is currently under Learning & Development training. Please contact your administrator for the training portal link.');
        }

        // Build redirect URL with identity params
        $params = [
            'pms_user_id' => $user->id,
            'plan'        => $user->employee?->lnd_reference_id ?? '',
        ];

        // Sign the redirect so L&D can verify it came from PMS
        $secret = config('services.lnd.redirect_hmac_secret', '');
        if (! empty($secret)) {
            $params['sig'] = hash_hmac(
                'sha256',
                $params['pms_user_id'] . $params['plan'],
                $secret
            );
        }

        $redirectUrl = $lndBase . '/intake?' . http_build_query($params);

        // Use Inertia::location() to force a full browser redirect
        // instead of an XHR redirect which gets blocked by CORS
        if ($request->header('X-Inertia')) {
            return \Inertia\Inertia::location($redirectUrl);
        }

        return redirect()->away($redirectUrl);
    }
}
