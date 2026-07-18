<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->validateCsrfTokens(except: [
            '/send/id',
            '/activate/complete',
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        $middleware->alias([
            'role'               => RoleMiddleware::class,
            'permission'         => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'training.locked'    => \App\Http\Middleware\RedirectIfTrainingLocked::class,
            'lnd.callback.token' => \App\Http\Middleware\VerifyLndCallbackToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Render login throttle (429) as an inline error the React form can show
        // as a banner, instead of Laravel's full-page "Too Many Requests" view.
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if (! $request->is('login') || ! $request->header('X-Inertia')) {
                return null;
            }

            $seconds = (int) ($e->getHeaders()['Retry-After'] ?? 0);

            return back()->withErrors([
                'throttle' => $seconds > 0
                    ? "Too many login attempts. Please try again in {$seconds} second".($seconds === 1 ? '' : 's').'.'
                    : 'Too many login attempts. Please try again later.',
            ]);
        });

        // Render HTTP errors (404, 403, 419, 429, 500) as Inertia React page.
        $exceptions->render(function (HttpException $e, Request $request) {
            $status = $e->getStatusCode();

            if (! in_array($status, [403, 404, 419, 429, 500])) {
                return null;
            }

            return Inertia::render('Error', ['status' => $status])
                ->toResponse($request)
                ->setStatusCode($status);
        });
    })->create();
