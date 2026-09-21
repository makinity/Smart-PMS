<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Fortify;
use Spatie\Permission\Models\Role;

class FortifyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Fortify::loginView(fn () => inertia('Auth/Login'));

        Fortify::authenticateUsing(function (Request $request) {
            $name  = Str::lower(trim((string) $request->input('name')));
            $pmsId = trim((string) ($request->input('pms_id') ?? $request->input('employee_id')));

            $users = User::query()
                ->whereRaw('LOWER(TRIM(name)) = ?', [$name])
                ->get();

            if ($users->count() > 1) {
                // Duplicate names found — require PMS ID to disambiguate.
                if ($pmsId === '') {
                    throw ValidationException::withMessages([
                        'pms_id'      => 'needs_disambiguation',
                        'employee_id' => 'needs_disambiguation',
                    ]);
                }

                // Filter down to the user whose employee record matches the given ID.
                $user = $users->first(function (User $u) use ($pmsId) {
                    return $u->employee && (
                        strtolower(trim($u->employee->pms_id ?? '')) === strtolower($pmsId) ||
                        strtolower(trim($u->employee->employee_id ?? '')) === strtolower($pmsId)
                    );
                });

                if (! $user) {
                    throw ValidationException::withMessages([
                        'pms_id'      => 'The PMS ID does not match any account with that name.',
                        'employee_id' => 'The PMS ID does not match any account with that name.',
                    ]);
                }
            } else {
                $user = $users->first();
            }

            if (! $user || ! Hash::check((string) $request->input('password'), (string) $user->password)) {
                return null;
            }

            $user->loadMissing('employee');

            if (! ($user->employee?->is_active ?? false)) {
                throw ValidationException::withMessages([
                    'name' => 'Your account has not been activated yet.',
                ]);
            }

            if ($user->employee?->is_disabled ?? false) {
                throw ValidationException::withMessages([
                    'name' => 'Your account is disabled. Please contact the administrator.',
                ]);
            }

            if ($user->role && ! $user->hasRole($user->role)) {
                Role::findOrCreate($user->role, 'web');
                $user->syncRoles([$user->role]);
            }

            return $user;
        });

        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::redirectUserForTwoFactorAuthenticationUsing(RedirectIfTwoFactorAuthenticatable::class);

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower(trim((string) $request->input('name'))).'|'.$request->ip());

            return Limit::perMinute(3)->by($throttleKey);
        });

        RateLimiter::for('activation-verify', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('passkeys', function (Request $request) {
            $credentialId = $request->input('credential.id');

            return Limit::perMinute(10)->by(
                ($credentialId ?: $request->session()->getId()).'|'.$request->ip()
            );
        });
    }

    public function register(): void
    {
        $this->app->singleton(LoginResponseContract::class, \App\Http\Responses\LoginResponse::class);
    }
}
