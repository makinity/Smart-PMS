<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — V1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Public routes (no auth required)
    // Route::post('auth/login',  [AuthController::class, 'login']);

    // Protected routes
    // Route::middleware('auth:sanctum')->group(function () {
    //
    // });

});
