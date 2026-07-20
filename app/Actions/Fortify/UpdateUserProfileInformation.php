<?php

namespace App\Actions\Fortify;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\UpdatesUserProfileInformation;

class UpdateUserProfileInformation implements UpdatesUserProfileInformation
{
    /**
     * Validate and update the given user's profile information.
     *
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function update(User $user, array $input): void
    {
        Validator::make($input, [
            'name'          => ['required', 'string', 'max:255'],
            'email'         => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'profile_photo' => ['nullable', 'image', 'max:2048'],
        ])->validateWithBag('updateProfileInformation');

        // ── Update auth fields on users table ────────────────────────────────
        if ($input['email'] !== $user->email && $user instanceof MustVerifyEmail) {
            $this->updateVerifiedUser($user, $input);
        } else {
            $user->forceFill([
                'name'  => trim($input['name']),
                'email' => Str::lower(trim($input['email'])),
            ])->save();
        }

        // ── Update profile photo on employees table ───────────────────────────
        $photo = $input['profile_photo'] ?? null;
        if ($photo instanceof \Illuminate\Http\UploadedFile) {
            $employee = $user->employee ?? Employee::create(['user_id' => $user->id]);

            $oldPath = $employee->profile_photo_path;
            $path    = $photo->store('profile-photos', 'public');

            $employee->forceFill(['profile_photo_path' => $path])->save();

            if ($oldPath && $oldPath !== $path) {
                Storage::disk('public')->delete($oldPath);
            }
        }
    }

    /**
     * Update the given verified user's profile information.
     *
     * @param  array<string, string>  $input
     */
    protected function updateVerifiedUser(User $user, array $input): void
    {
        $user->forceFill([
            'name'               => trim($input['name']),
            'email'              => Str::lower(trim($input['email'])),
            'email_verified_at'  => null,
        ])->save();

        $user->sendEmailVerificationNotification();
    }
}
