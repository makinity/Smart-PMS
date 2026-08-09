<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HrmoHubConnection;
use App\Services\AdminUserManagementService;
use Illuminate\Http\Request;
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
     */
    public function connect(Request $request)
    {
        $data = $request->validate([
            'pillar'   => ['required', 'string', 'in:rsp,rnr,ld'],
            'base_url' => ['required', 'url'],
            'token'    => ['required', 'string', 'min:8'],
        ]);

        $connection = HrmoHubConnection::where('pillar', $data['pillar'])->firstOrFail();
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
            $response = \Illuminate\Support\Facades\Http::withToken($connection->token)
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
}
