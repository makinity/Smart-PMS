<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HrmoHubConnection;
use App\Services\AdminUserManagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class HrmoHubController extends Controller
{
    public function index()
    {
        // Ensure default pillars exist
        HrmoHubConnection::seedDefaults();

        $connections = HrmoHubConnection::orderByRaw("FIELD(pillar, 'rsp', 'pms', 'rnr', 'ld') ASC")
            ->get()
            ->map(fn ($c) => [
                'id'              => $c->id,
                'pillar'          => $c->pillar,
                'name'            => $c->name,
                'base_url'        => $c->base_url,
                'has_token'       => filled($c->token),
                'status'          => $c->status,
                'last_sync_at'    => $c->last_sync_at?->diffForHumans(),
                'last_sync_result'=> $c->last_sync_result,
            ]);

        return Inertia::render('Admin/HrmoHub/Index', [
            'connections' => $connections,
        ]);
    }

    /**
     * Save connection settings for a pillar.
     *
     * For the L&D pillar: fires an outbound connection request to L&D and sets
     * status = pending_acceptance until L&D admin accepts via their Hub page.
     *
     * For all other pillars: saves directly as connected (no handshake needed).
     */
    public function connect(Request $request)
    {
        $data = $request->validate([
            'pillar'   => ['required', 'string', 'in:rsp,rnr,ld'],
            'base_url' => ['required', 'url'],
            'token'    => ['required', 'string', 'min:8'],
        ]);

        $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();

        // L&D requires a mutual handshake — fire a connection request and wait for acceptance
        if ($data['pillar'] === 'ld') {
            $connection->update([
                'base_url' => $data['base_url'],
                'token'    => $data['token'],
                'status'   => HrmoHubConnection::STATUS_PENDING_ACCEPTANCE,
            ]);

            $this->sendLdConnectionRequest($data['base_url'], $data['token']);

            return back()->with('success', 'Connection request sent to L&D. Waiting for their admin to accept.');
        }

        // Other pillars: save as connected immediately
        $connection->update([
            'base_url' => $data['base_url'],
            'token'    => $data['token'],
            'status'   => HrmoHubConnection::STATUS_CONNECTED,
        ]);

        return back()->with('success', ucfirst($data['pillar']) . ' connected successfully.');
    }

    /**
     * Disconnect a pillar.
     */
    public function disconnect(Request $request)
    {
        $data = $request->validate([
            'pillar' => ['required', 'string', 'in:rsp,rnr,ld'],
        ]);

        $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();

        // For L&D: notify their Hub so they also mark themselves as disconnected
        if ($data['pillar'] === 'ld' && $connection->base_url && $connection->token) {
            try {
                \Illuminate\Support\Facades\Http::withToken($connection->token)
                    ->timeout(5)
                    ->post(rtrim($connection->base_url, '/') . '/api/hub/disconnect', [
                        'pillar' => 'pms',
                    ]);
            } catch (\Throwable) {
                // best-effort, don't block the disconnect
            }
        }

        $connection->update([
            'base_url' => null,
            'token'    => null,
            'status'   => HrmoHubConnection::STATUS_DISCONNECTED,
        ]);

        return back()->with('success', ucfirst($data['pillar']) . ' disconnected.');
    }

    /**
     * Test connection for a pillar.
     */
    public function testConnection(Request $request)
    {
        $data = $request->validate([
            'pillar' => ['required', 'string', 'in:rsp,rnr,ld'],
        ]);

        $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();

        if (!$connection->base_url || !$connection->token) {
            return back()->withErrors(['message' => 'No connection configured for this pillar.']);
        }

        try {
            $response = Http::withToken($connection->token)
                ->timeout(10)
                ->get($connection->base_url);

            if ($response->successful()) {
                return back()->with('success', ucfirst($data['pillar']) . ' connection is working. Status: ' . $response->status());
            }

            return back()->withErrors(['message' => 'Connection failed. Status: ' . $response->status()]);
        } catch (\Exception $e) {
            return back()->withErrors(['message' => 'Connection failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Sync data for a pillar (currently only RSP/HRS).
     */
    public function sync(Request $request, AdminUserManagementService $service)
    {
        $data = $request->validate([
            'pillar'   => ['required', 'string', 'in:rsp'],
            'base_url' => ['required', 'url'],
            'token'    => ['required', 'string', 'min:8'],
        ]);

        $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();

        $summary = $service->syncFromHris($data['base_url'], $data['token'], $request->user());

        $connection->update([
            'last_sync_at'     => now(),
            'last_sync_result' => $summary,
        ]);

        return back()->with('summary', $summary);
    }

    // ── Private ──────────────────────────────────────────────────────────────

    /**
     * Fire the connection request payload to L&D's Hub API endpoint.
     * Best-effort — logs on failure but does not abort the connect action.
     */
    private function sendLdConnectionRequest(string $ldBaseUrl, string $ldToken): void
    {
        try {
            $response = Http::withToken($ldToken)
                ->timeout(10)
                ->post(rtrim($ldBaseUrl, '/') . '/api/hub/connection-request', [
                    'pillar'         => 'pms',
                    'base_url'       => config('app.url'),
                    'callback_token' => config('services.pms.callback_token'),
                ]);

            if (! $response->successful()) {
                Log::warning('HrmoHubController: L&D connection request returned non-2xx.', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('HrmoHubController: failed to send L&D connection request.', [
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
