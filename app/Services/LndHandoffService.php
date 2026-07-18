<?php

namespace App\Services;

use App\Models\DevelopmentPlan;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class LndHandoffService
{
    public function sendDevelopmentPlan(DevelopmentPlan $developmentPlan): array
    {
        $baseUrl = trim((string) config('services.lnd.base_url', ''));
        $token = trim((string) config('services.lnd.token', ''));
        $timeout = (int) config('services.lnd.timeout', 20);

        if ($baseUrl === '') {
            throw new RuntimeException('LND API base URL is not configured.');
        }

        if ($token === '') {
            throw new RuntimeException('LND API token is not configured.');
        }

        $endpoint = rtrim($baseUrl, '/') . '/api/lnd/development-plans';

        $payload = $this->buildPayload($developmentPlan);

        $response = Http::timeout(max(5, $timeout))
            ->acceptJson()
            ->asJson()
            ->withToken($token)
            ->post($endpoint, $payload);

        $body = $response->json();
        if (!is_array($body)) {
            $body = [];
        }

        if (!$response->successful()) {
            $message = (string) ($body['message'] ?? ('LND API returned HTTP ' . $response->status()));
            throw new RuntimeException($message);
        }

        return [
            'ok' => (bool) ($body['ok'] ?? true),
            'status' => (string) ($body['status'] ?? 'sent'),
            'lnd_reference_id' => isset($body['lnd_reference_id']) ? (string) $body['lnd_reference_id'] : null,
            'message' => isset($body['message']) ? (string) $body['message'] : null,
            'payload' => $payload,
        ];
    }

    public function buildPayload(DevelopmentPlan $developmentPlan): array
    {
        $developmentPlan->loadMissing([
            'performancePeriod',
            'employee.office',
            'ipcr.items.indicator.uwpMfo.uwpFunction',
            'ipcr.items.indicator.qetStandards',
        ]);

        $ipcr   = $developmentPlan->ipcr;
        $period = $developmentPlan->performancePeriod;

        return [
            'external_plan_id' => 'PMS-DP-' . $developmentPlan->id,
            'source_system'    => 'PMS',

            'period' => [
                'id'   => (int) ($developmentPlan->performance_period_id ?? 0),
                'name' => (string) ($period?->name ?? '--'),
            ],

            'employee' => [
                'id'          => (int) ($developmentPlan->employee_id ?? 0),
                'name'        => (string) ($developmentPlan->employee?->name ?? '--'),
                'email'       => (string) ($developmentPlan->employee?->email ?? '--'),
                'office_id'   => (int) ($developmentPlan->office_id ?? 0),
                'office_name' => (string) ($developmentPlan->employee?->office?->name ?? '--'),
                'position'    => (string) ($developmentPlan->employee?->position ?? '--'),
            ],

            'performance' => [
                'official_score'      => is_numeric($developmentPlan->source_score)
                    ? round((float) $developmentPlan->source_score, 2) : 0.0,
                'official_rating'     => (string) ($developmentPlan->source_rating ?? '--'),
                'pmt_adjusted_score'  => $ipcr && is_numeric($ipcr->pmt_adjusted_score)
                    ? round((float) $ipcr->pmt_adjusted_score, 2) : null,
                'pmt_adjusted_rating' => $ipcr?->pmt_adjusted_rating ?? null,
                'released_at'         => optional($ipcr?->released_at)->toISOString(),
            ],

            // Full IPCR breakdown: Functions → MFOs → Indicators with Q/E/T/A + QET standards
            'ipcr' => [
                'id'              => (int) ($developmentPlan->ipcr_id ?? 0),
                'functions'       => $ipcr && $period ? $this->buildIpcrFunctions($ipcr, $period) : [],
                'weighted_summary'=> $ipcr && $period ? $this->buildWeightedSummary($ipcr, $period) : [],
            ],

            // IDP development plan rows filled by the employee
            'idp_rows' => array_map(fn ($row) => [
                'performance_gap'         => (string) ($row['performance_gap'] ?? ''),
                'developmental_activity'  => (string) ($row['developmental_activity'] ?? ''),
                'support_needed'          => (string) ($row['support_needed'] ?? ''),
                'support_from_supervisor' => (string) ($row['support_from_supervisor'] ?? ''),
                'expected_completion'     => (string) ($row['expected_completion'] ?? ''),
                'results'                 => (string) ($row['results'] ?? ''),
            ], $developmentPlan->idp_rows ?? []),

            'references' => [
                'ipcr_id' => (int) ($developmentPlan->ipcr_id ?? 0),
                'opcr_id' => null,
            ],
        ];
    }

    /**
     * Build the full IPCR function → MFO → indicator tree with Q/E/T/A ratings
     * and QET standards — mirrors what the employee IPCR Preview screen shows.
     */
    private function buildIpcrFunctions(\App\Models\Ipcr $ipcr, PerformancePeriod $period): array
    {
        $fnMap = [];

        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo       = $indicator?->uwpMfo;
            $fn        = $mfo?->uwpFunction;

            if (! $fn || ! $mfo || ! $indicator) {
                continue;
            }

            $fnKey  = $fn->id;
            $mfoKey = $mfo->id;

            if (! isset($fnMap[$fnKey])) {
                $fnMap[$fnKey] = [
                    'id'            => (int) $fn->id,
                    'name'          => (string) $fn->name,
                    'function_type' => (string) ($fn->function_type ?? 'core'),
                    'weight_percent'=> is_numeric($fn->weight_percent) ? (float) $fn->weight_percent : null,
                    'mfos'          => [],
                ];
            }

            if (! isset($fnMap[$fnKey]['mfos'][$mfoKey])) {
                $fnMap[$fnKey]['mfos'][$mfoKey] = [
                    'id'         => (int) $mfo->id,
                    'title'      => (string) $mfo->title,
                    'indicators' => [],
                ];
            }

            $ratings = $this->computeIndicatorRatings($item->id, $period);

            // QET Standards (Quality/Efficiency/Timeliness rating scale descriptions)
            $standards = $indicator->qetStandards->map(fn ($s) => [
                'dimension'     => (string) $s->dimension,
                'rating'        => (int) $s->rating,
                'standard_text' => (string) $s->standard_text,
            ])->values()->all();

            $fnMap[$fnKey]['mfos'][$mfoKey]['indicators'][] = [
                'id'              => (int) $item->id,
                'indicator_text'  => (string) ($indicator->indicator_text ?? '--'),
                'target_quantity' => $indicator->target_quantity,
                'target_timeline' => (string) ($indicator->target_timeline ?? '--'),
                'ratings'         => $ratings,   // Q, E, T, A
                'standards'       => $standards,
            ];
        }

        // Flatten mfos from keyed map to indexed array
        foreach ($fnMap as &$fn) {
            $fn['mfos'] = array_values($fn['mfos']);
        }

        return array_values($fnMap);
    }

    /**
     * Build per-function-type weighted scores — mirrors the
     * "Performance Summary" section at the bottom of the IPCR screen.
     */
    private function buildWeightedSummary(\App\Models\Ipcr $ipcr, PerformancePeriod $period): array
    {
        $fnMap = [];

        foreach ($ipcr->items as $item) {
            $fn = $item->indicator?->uwpMfo?->uwpFunction;
            if (! $fn) continue;

            $fnKey = $fn->id;
            if (! isset($fnMap[$fnKey])) {
                $fnMap[$fnKey] = [
                    'function_name'  => (string) $fn->name,
                    'weight_percent' => is_numeric($fn->weight_percent) ? (float) $fn->weight_percent : 0.0,
                    'a_ratings'      => [],
                ];
            }

            $ratings = $this->computeIndicatorRatings($item->id, $period);
            if ($ratings['A'] !== null) {
                $fnMap[$fnKey]['a_ratings'][] = (float) $ratings['A'];
            }
        }

        $summary = [];
        foreach ($fnMap as $data) {
            $aRatings = $data['a_ratings'];
            $weight   = $data['weight_percent'];
            if (empty($aRatings) || $weight <= 0) continue;

            $avg            = array_sum($aRatings) / count($aRatings);
            $weightedScore  = round($avg * ($weight / 100), 2);

            $summary[] = [
                'function_name'  => $data['function_name'],
                'weight_percent' => $weight,
                'average_rating' => round($avg, 2),
                'weighted_score' => $weightedScore,
            ];
        }

        return $summary;
    }

    /**
     * Compute Q/E/T/A ratings for a single IPCR item from its ORS entries.
     * Same logic as SmporIpcrAccomplishmentController::computeIndicatorRatings().
     */
    private function computeIndicatorRatings(int $ipcrItemId, PerformancePeriod $period): array
    {
        $entries = OrsEntry::where('ipcr_item_id', $ipcrItemId)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [
                $period->start_date->toDateString(),
                $period->end_date->toDateString(),
            ])
            ->with(['monitoring', 'ipcrItem.indicator'])
            ->get();

        if ($entries->isEmpty()) {
            return ['Q' => null, 'E' => null, 'T' => null, 'A' => null, 'actual_quantity' => 0];
        }

        $totalQty  = $entries->sum('quantity');
        $qualPts   = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
        $timePts   = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));

        $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
        $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;

        $targetQty = $entries->first()?->ipcrItem?->indicator?->target_quantity;
        $E = (is_numeric($targetQty) && (float) $targetQty > 0)
            ? min(5.00, round(($totalQty / (float) $targetQty) * 5, 2))
            : $Q;

        $A = ($Q !== null && $E !== null && $T !== null)
            ? round(($Q + $E + $T) / 3, 2)
            : null;

        return [
            'Q'               => $Q,
            'E'               => $E,
            'T'               => $T,
            'A'               => $A,
            'actual_quantity' => (float) $totalQty,
        ];
    }
}

