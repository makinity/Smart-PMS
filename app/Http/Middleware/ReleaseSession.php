<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Release the session lock immediately so other concurrent requests from the
 * same browser session (e.g. Echo broadcasting auth) are not serialized behind
 * this endpoint.
 *
 * Apply to POST/PATCH endpoints that don't need to write to the session.
 */
class ReleaseSession
{
    public function handle(Request $request, Closure $next): Response
    {
        session()->save();

        return $next($request);
    }
}
