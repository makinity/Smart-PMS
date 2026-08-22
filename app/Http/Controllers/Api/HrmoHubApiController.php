<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HrmoHubConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class HrmoHubApiController extends Controller
{
    /**
     * Receive the accept/reject callback from an HRIS pillar.
     *
     * Called by L&D (or any other pillar) after their admin accepts or rejects
     * the connection request PMS sent via HrmoHubController::connect().
     *
     * Route:  POST /api/hub/connection-accepted
     * Auth:   VerifyLndCallbackToken (Bearer PMS_CALLBACK_TOKEN)
     */
    public function connectionAccepted(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pillar' => ['required', 'string', 'in:ld,rsp,rnr'],
            'status' => ['required', 'string', 'in:accepted,rejected'],
        ]);

        $connection = HrmoHubConnection::where('pillar', $data['pillar'])->first();

        if (! $connection) {
            return response()->json(['ok' => false, 'message' => 'Unknown pillar.'], 404);
        }

        $newStatus = $data['status'] === 'accepted'
            ? HrmoHubConnection::STATUS_CONNECTED
            : HrmoHubConnection::STATUS_REJECTED;

        $connection->update([
            'status'           => $newStatus,
            'last_sync_at'     => now(),
            'last_sync_result' => [
                'handshake' => $data['status'],
                'at'        => now()->toISOString(),
            ],
        ]);

        Log::info('HrmoHubApiController: connection ' . $data['status'] . ' by pillar.', [
            'pillar' => $data['pillar'],
            'status' => $newStatus,
        ]);

        return response()->json(['ok' => true]);
    }
}
