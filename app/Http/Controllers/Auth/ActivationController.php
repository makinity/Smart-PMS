<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\AccountActivationToken;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ActivationController extends Controller
{
    public function verify(Request $request): JsonResponse
    {
        $idKey = $request->has('pms_id') ? 'pms_id' : 'employee_id';

        $request->validate([
            $idKey  => ['required', 'regex:/^(ADM|PMT|DPT|SPV|EMP|HRM)-[A-Z0-9-]{3,50}$/i'],
            'email' => ['required', 'email'],
        ], [
            "{$idKey}.regex" => 'The PMS ID format is invalid (e.g. EMP-10523, PMT-15538, ADM-00001).',
            "{$idKey}.required" => 'The PMS ID field is required.',
        ]);

        $pmsId = Str::upper(trim((string) $request->input($idKey)));
        $email = Str::lower(trim((string) $request->input('email')));

        // Look up via employees table by pms_id, match on email via users
        $user = User::query()
            ->whereHas('employee', fn ($q) => $q->whereRaw('UPPER(TRIM(pms_id)) = ?', [$pmsId]))
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->with('employee')
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                $idKey => 'No matching account was found with this PMS ID and email.',
            ]);
        }

        if ($user->employee?->is_active) {
            return response()->json([
                'message' => 'This account is already activated. Please log in instead.',
            ], 409);
        }

        $plainToken = Str::random(40);

        AccountActivationToken::query()
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->delete();

        AccountActivationToken::create([
            'user_id'    => $user->id,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addMinutes(10),
        ]);

        return response()->json([
            'message' => 'Verification successful.',
            'token'   => $plainToken,
        ]);
    }

    public function complete(Request $request): \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
    {
        $request->validate([
            'token'                 => ['required', 'string'],
            'password'              => ['required', 'string', PasswordValidationRules::strongPassword(), 'confirmed'],
            'password_confirmation' => ['required', 'string'],
        ]);

        $tokenHash = hash('sha256', $request->string('token')->toString());

        $activationToken = AccountActivationToken::query()
            ->with('user.employee')
            ->where('token_hash', $tokenHash)
            ->first();

        if (
            ! $activationToken ||
            $activationToken->used_at ||
            $activationToken->expires_at->isPast()
        ) {
            throw ValidationException::withMessages([
                'token' => 'The activation token is invalid, expired, or already used.',
            ]);
        }

        $user = $activationToken->user;

        if (! $user || ($user->employee?->is_active ?? false)) {
            throw ValidationException::withMessages([
                'token' => 'This account is already activated. Please log in instead.',
            ]);
        }

        // Get or create employee record
        $employee = $user->employee ?? Employee::create(['user_id' => $user->id]);

        // Store profile photo on the employee record
        if ($request->hasFile('profile_photo')) {
            $disk = config('filesystems.default') === 's3' ? 's3' : 'public';
            $path = $request->file('profile_photo')->store('profile-photos', $disk);
            $employee->profile_photo_path = $path;
        }

        // Set password on user (auth concern)
        $user->forceFill([
            'password' => Hash::make($request->string('password')->toString()),
        ])->save();

        // Set activation state on employee (HR concern)
        $employee->forceFill([
            'is_active'    => true,
            'activated_at' => now(),
        ])->save();

        $activationToken->forceFill(['used_at' => now()])->save();

        Auth::login($user);
        $request->session()->regenerate();

        $dashboard = match ($user->role) {
            'admin'      => '/administrator',
            'pmt'        => '/pmt',
            'dept-head'  => '/dept-head',
            'supervisor' => '/supervisor',
            default      => '/employee',
        };

        return Inertia::location($dashboard);
    }
}
