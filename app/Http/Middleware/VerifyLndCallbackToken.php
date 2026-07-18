<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyLndCallbackToken
{
    /**
     * Verify that inbound L&D callback requests carry the correct Bearer token.
     * Token is stored in PMS .env as PMS_CALLBACK_TOKEN.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.pms.callback_token', '');

        if (empty($expected)) {
            abort(500, 'PMS callback token is not configured.');
        }

        $provided = $request->bearerToken() ?? '';

        if (! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $next($request);
    }
}
