<?php

namespace App\Actions\Fortify;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Validation\Rules\Password;

trait PasswordValidationRules
{
    protected function passwordRules(): array
    {
        return ['required', 'string', self::strongPassword(), 'confirmed'];
    }

    public static function strongPassword(): Password
    {
        return Password::min(8)
            ->mixedCase()          // must have uppercase AND lowercase
            ->numbers()            // must have at least one number
            ->symbols()            // must have at least one symbol
            ->uncompromised();     // checks against known breached password lists (common passwords included)
    }
}
