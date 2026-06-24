<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\DevelopmentPlan;
use App\Models\EmployeePerformanceSnapshot;
use App\Models\Ipcr;
use App\Models\OrsEntry;
use Inertia\Inertia;

class HistoryController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $user->load('office:id,name,code');

        $ipcrs = Ipcr::with('period:id,name,start_date,end_date')
            ->where('employee_id', $user->id)
            ->whereNotNull('final_score')
            ->orderByDesc('performance_period_id')
            ->get()
            ->map(fn ($ipcr) => [
                'id'             => $ipcr->id,
                'period'         => $ipcr->period?->name,
                'status'         => $ipcr->status,
                'final_score'    => $ipcr->final_score ? round((float) $ipcr->final_score, 2) : null,
                'adjectival'     => $ipcr->adjectival_rating,
                'pmt_score'      => $ipcr->pmt_adjusted_score ? round((float) $ipcr->pmt_adjusted_score, 2) : null,
                'pmt_adjectival' => $ipcr->pmt_adjusted_rating,
                'committed_at'   => $ipcr->committed_at?->format('M d, Y'),
            ]);

        $submissions = AccomplishmentSubmission::with('period:id,name')
            ->where('employee_id', $user->id)
            ->orderByDesc('performance_period_id')
            ->get()
            ->map(fn ($s) => [
                'id'               => $s->id,
                'period'           => $s->period?->name,
                'status'           => $s->status,
                'final_rating'     => $s->final_rating ? round((float) $s->final_rating, 2) : null,
                'final_adjectival' => $s->final_adjectival_rating,
                'flagged'          => $s->dept_head_flagged_for_calibration,
                'submitted_at'     => $s->submitted_at?->format('M d, Y'),
                'pmt_action_at'    => $s->pmt_action_at?->format('M d, Y'),
            ]);

        $idps = DevelopmentPlan::with('performancePeriod:id,name')
            ->where('employee_id', $user->id)
            ->orderByDesc('performance_period_id')
            ->get()
            ->map(fn ($d) => [
                'id'               => $d->id,
                'period'           => $d->performancePeriod?->name,
                'status'           => $d->status,
                'source_score'     => $d->source_score ? round((float) $d->source_score, 2) : null,
                'source_rating'    => $d->source_rating,
                'lnd_sync_status'  => $d->lnd_sync_status,
                'submitted_to_ld_at' => $d->submitted_to_ld_at?->format('M d, Y'),
                'idp_rows'         => $d->idp_rows ?? [],
            ]);

        $history = [];
        foreach ($ipcrs as $ipcr) {
            $period = $ipcr['period'];
            if (! isset($history[$period])) {
                $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null, 'snapshot' => null];
            }
            $history[$period]['ipcr'] = $ipcr;
        }
        foreach ($submissions as $sub) {
            $period = $sub['period'];
            if (! isset($history[$period])) {
                $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null, 'snapshot' => null];
            }
            $history[$period]['submission'] = $sub;
        }
        foreach ($idps as $idp) {
            $period = $idp['period'];
            if (! isset($history[$period])) {
                $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null, 'snapshot' => null];
            }
            $history[$period]['idp'] = $idp;
        }

        // Enrich with snapshot data (per-period summary)
        EmployeePerformanceSnapshot::with('period:id,name')
            ->where('employee_id', $user->id)
            ->whereNotNull('performance_period_id')
            ->get()
            ->groupBy(fn ($s) => $s->period?->name)
            ->each(function ($rows, $period) use (&$history) {
                if (! isset($history[$period])) {
                    $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null, 'snapshot' => null];
                }
                $history[$period]['snapshot'] = [
                    'indicator_count'      => $rows->count(),
                    'avg_score'            => round($rows->whereNotNull('final_score')->avg('final_score') ?? 0, 2),
                    'previous_final_score' => $rows->first()?->previous_final_score,
                    'previous_adjectival'  => $rows->first()?->previous_adjectival_rating,
                    'was_flagged'          => $rows->contains('was_flagged_for_calibration', true),
                    'feasibility_labels'   => $rows->whereNotNull('feasibility_label')
                        ->countBy('feasibility_label')->toArray(),
                ];
            });

        $ratedSubmissions = $submissions->filter(fn ($s) => $s['final_rating'] !== null);
        $bestSubmission = $ratedSubmissions->sortByDesc('final_rating')->first();

        $stats = [
            'periods_rated'  => $ratedSubmissions->count(),
            'avg_rating'     => $ratedSubmissions->count() > 0 ? round($ratedSubmissions->avg('final_rating'), 2) : null,
            'best_rating'    => $bestSubmission ? $bestSubmission['final_rating'] : null,
            'best_period'    => $bestSubmission ? $bestSubmission['period'] : null,
            'idps_submitted' => $idps->where('status', DevelopmentPlan::STATUS_SUBMITTED_TO_LD)->count(),
        ];

        $chartData = $ratedSubmissions->reverse()->values()->map(fn ($s) => [
            'period' => $s['period'],
            'score'  => $s['final_rating'],
        ]);

        return Inertia::render('Employee/History/Index', [
            'employee'  => [
                'id'           => $user->id,
                'employee_id'  => $user->employee_id,
                'name'         => $user->name,
                'email'        => $user->email,
                'position'     => $user->position,
                'is_active'    => $user->is_active,
                'activated_at' => $user->activated_at?->format('M d, Y'),
                'created_at'   => $user->created_at->format('M d, Y'),
                'avatar'       => $user->profile_photo_url,
                'office'       => $user->office ? ['name' => $user->office->name, 'code' => $user->office->code] : null,
            ],
            'stats'     => $stats,
            'history'   => array_values($history),
            'ipcrs'     => $ipcrs,
            'idps'      => $idps,
            'chartData' => $chartData,
        ]);
    }

    public function showIpcr(Ipcr $ipcr)
    {
        $user = auth()->user();
        abort_unless($ipcr->employee_id === $user->id, 403);

        $ipcr->load([
            'items.indicator.uwpMfo.uwpFunction',
            'items.indicator.qetStandards',
            'period:id,name,start_date,end_date',
        ]);

        $sections     = $this->buildIpcrSections($ipcr);
        $meta         = $this->buildIpcrMeta($ipcr);
        $typeAratings = [];

        foreach ($sections as $fn) {
            $aRatings = [];
            foreach ($fn['mfos'] as $mfo) {
                foreach ($mfo['indicators'] as $ind) {
                    if ($ind['ratings']['A'] !== null) $aRatings[] = (float) $ind['ratings']['A'];
                }
            }
            if (! empty($aRatings)) {
                $weight         = (float) ($fn['weight'] ?? 0);
                $avg            = array_sum($aRatings) / count($aRatings);
                $typeAratings[] = ['label' => $fn['name'], 'weight' => $weight, 'weighted_score' => round($avg * ($weight / 100), 2)];
            }
        }

        return Inertia::render('Employee/History/IpcrShow', [
            'period'   => ['id' => $ipcr->period->id, 'name' => $ipcr->period->name],
            'employee' => ['name' => $user->name, 'office' => $user->office?->name],
            'sections' => $sections,
            'meta'     => array_merge($meta, ['type_scores' => $typeAratings]),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildIpcrSections(Ipcr $ipcr): array
    {
        $fnMap = [];
        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo = $indicator?->uwpMfo;
            $fn  = $mfo?->uwpFunction;
            if (! $fn || ! $mfo) continue;

            $fnKey  = $fn->id;
            $mfoKey = $mfo->id;
            if (! isset($fnMap[$fnKey])) {
                $fnMap[$fnKey] = ['id' => $fn->id, 'name' => $fn->name, 'function_type' => $fn->function_type, 'weight' => $fn->weight_percent ?? null, 'mfos' => []];
            }
            if (! isset($fnMap[$fnKey]['mfos'][$mfoKey])) {
                $fnMap[$fnKey]['mfos'][$mfoKey] = ['id' => $mfo->id, 'title' => $mfo->title, 'indicators' => []];
            }

            $fnMap[$fnKey]['mfos'][$mfoKey]['indicators'][] = [
                'id'              => $item->id,
                'indicator_text'  => $indicator->indicator_text,
                'target_quantity' => $indicator->target_quantity,
                'target_timeline' => $indicator->target_timeline,
                'standards'       => $indicator->qetStandards->map(fn ($s) => [
                    'dimension' => $s->dimension, 'rating' => $s->rating, 'standard_text' => $s->standard_text,
                ])->values()->all(),
                'ratings'         => $this->computeIndicatorRatings($item->id, $ipcr->period),
            ];
        }
        foreach ($fnMap as &$fn) {
            $fn['mfos'] = array_values($fn['mfos']);
        }
        return array_values($fnMap);
    }

    private function computeIndicatorRatings(int $ipcrItemId, $period): array
    {
        $entries = OrsEntry::where('ipcr_item_id', $ipcrItemId)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with('monitoring')
            ->get();

        if ($entries->isEmpty()) return ['Q' => null, 'E' => null, 'T' => null, 'A' => null];

        $totalQty = $entries->sum('quantity');
        $qualPts  = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
        $timePts  = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
        $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
        $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;
        $target = is_numeric($entries->first()?->ipcrItem?->indicator?->target_quantity)
            ? (float) $entries->first()->ipcrItem->indicator->target_quantity : null;
        $E = ($target && $target > 0) ? min(5.00, round(($totalQty / $target) * 5, 2)) : $Q;
        $A = ($Q !== null && $T !== null) ? round(($Q + $E + $T) / 3, 2) : null;

        return compact('Q', 'E', 'T', 'A');
    }

    private function buildIpcrMeta(Ipcr $ipcr): array
    {
        $submission = AccomplishmentSubmission::where('employee_id', $ipcr->employee_id)
            ->where('performance_period_id', $ipcr->performance_period_id)
            ->where('status', 'released_by_pmt')
            ->latest()->first();

        $score  = (float) ($submission?->final_rating ?? $ipcr->pmt_adjusted_score ?? $ipcr->final_score ?? 0);
        $rating = $submission?->final_adjectival_rating ?? $ipcr->pmt_adjusted_rating ?? $ipcr->adjectival_rating ?? null;

        return ['score' => round($score, 2), 'rating' => $rating, 'ipcr_id' => $ipcr->id];
    }
}
