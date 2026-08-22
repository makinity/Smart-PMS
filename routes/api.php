<?php

use App\Http\Controllers\Api\HrmoHubApiController;
use App\Http\Controllers\Api\LndCallbackController;
use App\Http\Middleware\VerifyLndCallbackToken;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — V1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

});

/*
|--------------------------------------------------------------------------
| L&D Inbound Callbacks
|--------------------------------------------------------------------------
| These routes are called by the L&D system, not by browser clients.
| They use a static Bearer token (PMS_CALLBACK_TOKEN) for auth.
|--------------------------------------------------------------------------
*/

Route::middleware(VerifyLndCallbackToken::class)
    ->prefix('lnd-callback')
    ->group(function () {
        Route::post('/complete-training', [LndCallbackController::class, 'completeTraining'])
            ->name('lnd-callback.complete-training');
    });

/*
|--------------------------------------------------------------------------
| HRMO Hub — Inbound Handshake Callbacks
|--------------------------------------------------------------------------
| Called by connected pillars (e.g. L&D) to accept or reject a connection
| request that PMS initiated. Uses the same PMS_CALLBACK_TOKEN as L&D callbacks.
|--------------------------------------------------------------------------
*/

Route::middleware(VerifyLndCallbackToken::class)
    ->prefix('hub')
    ->group(function () {
        Route::post('/connection-accepted', [HrmoHubApiController::class, 'connectionAccepted'])
            ->name('hub.connection-accepted');
    });

/*
|--------------------------------------------------------------------------
| L&D Sandbox — local self-ping for testing the handoff payload
| Set LND_API_BASE_URL=http://smart-pms.test/api in .env
| Full URL: http://smart-pms.test/api/lnd/development-plans
|--------------------------------------------------------------------------
*/
if (app()->environment('local')) {
    Route::post('/lnd/development-plans', function (\Illuminate\Http\Request $request) {
        \Illuminate\Support\Facades\Log::channel('single')->info('--- INBOUND MOCK L&D API CAPTURE ---', $request->all());

        return response()->json([
            'status'           => 'acknowledged',
            'lnd_reference_id' => 'SANDBOX-REF-' . rand(1000, 9999),
        ], 201);
    });
}
