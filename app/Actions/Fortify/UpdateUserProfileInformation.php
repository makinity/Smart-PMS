<?php

namespace App\Actions\Fortify;

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
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],

            'profile_photo' => ['nullable', 'image', 'max:2048'],
        ])->validateWithBag('updateProfileInformation');

        $oldProfilePhotoPath = $user->profile_photo_path;

        if ($input['email'] !== $user->email &&
            $user instanceof MustVerifyEmail) {
            $this->updateVerifiedUser($user, $input);
        } else {
            $user->forceFill([
                'name' => trim($input['name']),
                'email' => Str::lower(trim($input['email'])),
            ])->save();
        }

        $photo = $input['profile_photo'] ?? null;
        if ($photo instanceof \Illuminate\Http\UploadedFile) {
            $path = $photo->store('profile-photos', 'public');

            $user->forceFill([
                'profile_photo_path' => $path,
            ])->save();

            if ($oldProfilePhotoPath && $oldProfilePhotoPath !== $path) {
                Storage::disk('public')->delete($oldProfilePhotoPath);
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
            'name' => trim($input['name']),
            'email' => Str::lower(trim($input['email'])),
            'email_verified_at' => null,
        ])->save();

        $user->sendEmailVerificationNotification();
    }
}
