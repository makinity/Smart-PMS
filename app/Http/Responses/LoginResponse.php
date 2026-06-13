<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $request->session()->flash('just_logged_in', true);

        return redirect()->intended('/dashboard');
    }
}
