<?php

namespace App\Http\Controllers;

use App\Models\HrmoHubConnection;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * PillarDisconnectedController
 *
 * Serves the reusable "pillar not connected" error page for any HRMO pillar
 * (L&D, RSP, RnR, …) that is enrolled but not yet wired to PMS.
 *
 * Route: GET /pillar-disconnected?pillar=ld
 *
 * The controller pulls the human-readable pillar name from the
 * hrmo_hub_connections table so the page is always up to date.
 */
class PillarDisconnectedController extends Controller
{
    // Label overrides used when the pillar row is missing from the DB
    private const PILLAR_LABELS = [
        'ld'  => ['name' => 'Learning & Development',             'label' => 'L&D'],
        'rsp' => ['name' => 'Recruitment, Selection & Placement', 'label' => 'RSP'],
        'rnr' => ['name' => 'Rewards & Recognition',              'label' => 'RnR'],
    ];

    public function __invoke(Request $request): \Inertia\Response
    {
        $pillar = strtolower(trim((string) $request->query('pillar', 'ld')));

        // Try to get the display name from the Hub connections table
        $connection = HrmoHubConnection::where('pillar', $pillar)->first();

        // Derive pillar name / label
        $fallbackName  = self::PILLAR_LABELS[$pillar]['name']  ?? strtoupper($pillar);
        $fallbackLabel = self::PILLAR_LABELS[$pillar]['label'] ?? strtoupper($pillar);

        // Strip the prefix "RSP — " etc. from the stored name for a cleaner display
        $rawName     = $connection?->name ?? $fallbackName;
        $pillarName  = preg_replace('/^[A-Z&]+\s*—\s*/u', '', $rawName) ?: $fallbackName;
        $pillarLabel = $fallbackLabel;

        // Optional: surface a contact email so the user can reach the admin
        $contactEmail = config('app.admin_contact_email', '');

        return Inertia::render('PillarDisconnected', [
            'pillar'       => $pillar,
            'pillarName'   => $pillarName,
            'pillarLabel'  => $pillarLabel,
            'contactEmail' => $contactEmail ?: null,
        ]);
    }
}
