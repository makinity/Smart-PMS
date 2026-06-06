<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\AccountActivationToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ActivationController extends Controller
{
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id' => ['required', 'regex:/^EMP-[A-Z0-9-]{3,50}$/'],
            'email'       => ['required', 'email'],
        ]);

        $employeeId = trim($request->string('employee_id')->toString());
        $email = Str::lower(trim($request->string('email')->toString()));

        $user = User::query()
            ->whereRaw('LOWER(TRIM(employee_id)) = ?', [Str::lower($employeeId)])
            ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
            ->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'employee_id' => 'No matching account was found.',
            ]);
        }

        if ($user->is_active) {
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
            'user_id'     => $user->id,
            'token_hash'  => hash('sha256', $plainToken),
            'expires_at'  => now()->addMinutes(10),
        ]);

        return response()->json([
            'message' => 'Verification successful.',
            'token' => $plainToken,
        ]);
    }

    public function complete(Request $request): JsonResponse
    {
        $request->validate([
            'token'                  => ['required', 'string'],
            'password'               => ['required', 'string', PasswordValidationRules::strongPassword(), 'confirmed'],
            'password_confirmation'  => ['required', 'string'],
        ]);

        $tokenHash = hash('sha256', $request->string('token')->toString());

        $activationToken = AccountActivationToken::query()
            ->with('user')
            ->where('token_hash', $tokenHash)
            ->first();

        if (
            ! $activationToken ||
            $activationToken->used_at ||
            $activationToken->expires_at->isPast()
        ) {
            return response()->json([
                'message' => 'The activation token is invalid, expired, or already used.',
            ], 422);
        }

        $user = $activationToken->user;

        if (! $user) {
            return response()->json([
                'message' => 'The activation token is invalid, expired, or already used.',
            ], 422);
        }

        if ($user->is_active) {
            return response()->json([
                'message' => 'This account is already activated. Please log in instead.',
            ], 409);
        }

        if ($request->hasFile('profile_photo')) {
            $path = $request->file('profile_photo')->store('profile-photos', 'public');
            $user->profile_photo_path = $path;
        }

        $user->forceFill([
            'password'     => Hash::make($request->string('password')->toString()),
            'is_active'    => true,
            'activated_at' => now(),
        ])->save();

        $activationToken->forceFill([
            'used_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Account activated successfully.',
        ]);
    }
}
