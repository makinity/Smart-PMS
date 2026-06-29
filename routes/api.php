<?php

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
