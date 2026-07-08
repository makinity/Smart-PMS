<?php

namespace App\Services;

use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Carbon\Carbon;

class Stage4FormBuilderService
{
    public function toAdjectival(float $score): string
    {
        if ($score >= 5.0) {
            return 'Outstanding';
        }
        if ($score >= 4.0) {
            return 'Very Satisfactory';
        }
        if ($score >= 3.0) {
            return 'Satisfactory';
        }
        if ($score >= 2.0) {
            return 'Unsatisfactory';
        }

        return 'Poor';
    }

    public function resolveIpcrScore(Ipcr $ipcr): float
    {
        if ($ipcr->pmt_adjusted_score !== null) {
            return round((float) $ipcr->pmt_adjusted_score, 2);
        }

        $score = (float) ($ipcr->final_score ?? 0);
        if ($score <= 0) {
            $score = app(PerformanceRatingService::class)->calculateComputedScore($ipcr);
        }

        return round($score, 2);
    }

    /**
     * Build the SMPOR efficiency/quality/timeliness table for a set of MPOR ids within a period.
     * When an IPCR is supplied, its output structure pre-seeds the table so expected outputs
     * still appear even with no rated ORS data.
     */
    public function buildSmporTable(array $mporIds, PerformancePeriod $period, ?Ipcr $ipcr = null): array
    {
        if (empty($mporIds) && ! $ipcr) {
            return ['months' => [], 'sections' => []];
        }

        $start = $period->start_date->copy()->startOfMonth();
        $end = $period->end_date->copy()->endOfMonth();
        $months = [];
        for ($m = $start->copy(); $m->lte($end); $m->addMonth()) {
            $months[] = $m->format('M');
        }

        $entries = empty($mporIds) ? collect() : OrsEntry::whereIn('ipcr_item_id', function ($q) use ($mporIds) {
            $q->select('ipcr_items.id')->from('ipcr_items')
                ->join('ipcrs', 'ipcrs.id', '=', 'ipcr_items.ipcr_id')
                ->join('mpors', 'mpors.employee_id', '=', 'ipcrs.employee_id')
                ->whereIn('mpors.id', $mporIds);
        })
            ->where('status', 'rated')->whereNotNull('quantity')
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
            ->get();

        $sections = [];
        if ($ipcr) {
            $ipcr->loadMissing('items.indicator.uwpMfo.uwpFunction');
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) {
                    continue;
                }
                $sections[strtolower($fn->name)][$mfo->title] ??= [];
            }
        }
        foreach ($entries as $entry) {
            $mfo = $entry->ipcrItem?->indicator?->uwpMfo;
            $fn = $mfo?->uwpFunction;
            $fnType = strtolower($fn?->name ?? 'core');
            $outputTitle = $mfo?->title ?? 'Other';
            $monthLabel = Carbon::parse($entry->work_date)->format('M');
            $mon = $entry->monitoring->first();
            $qty = (int) $entry->quantity;

            $sections[$fnType][$outputTitle][$monthLabel]['qty'] = ($sections[$fnType][$outputTitle][$monthLabel]['qty'] ?? 0) + $qty;
            $sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$outputTitle][$monthLabel]['time_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
        }

        $result = [];
        $fnWeights = [];
        if ($ipcr) {
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                if ($fn) $fnWeights[strtolower($fn->name)] = (int) round((float) $fn->weight_percent);
            }
        }
        foreach ($entries as $entry) {
            $fn = $entry->ipcrItem?->indicator?->uwpMfo?->uwpFunction;
            if ($fn) $fnWeights[strtolower($fn->name)] = (int) round((float) $fn->weight_percent);
        }

        foreach ($sections as $fnType => $outputs) {
            $rows = [];
            foreach ($outputs as $title => $monthData) {
                $totalQty = array_sum(array_column($monthData, 'qty'));
                $totalQual = array_sum(array_column($monthData, 'qual_pts'));
                $totalTime = array_sum(array_column($monthData, 'time_pts'));
                $row = ['output' => $title, 'months' => [], 'total_qty' => $totalQty,
                    'avg_qual' => $totalQty > 0 ? round($totalQual / $totalQty, 2) : 0,
                    'avg_time' => $totalQty > 0 ? round($totalTime / $totalQty, 2) : 0];
                foreach ($months as $mo) {
                    $row['months'][$mo] = $monthData[$mo] ?? ['qty' => 0, 'qual_pts' => 0, 'time_pts' => 0];
                }
                $rows[] = $row;
            }
            $result[] = ['type' => $fnType, 'weight' => $fnWeights[$fnType] ?? 0, 'rows' => $rows];
        }

        return ['months' => $months, 'sections' => $result];
    }

    /**
     * Build the per-function/MFO IPCR section tree with Q/E/T/A ratings.
     */
    public function buildIpcrSections(Ipcr $ipcr, PerformancePeriod $period): array
    {
        $fnMap = [];
        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo = $indicator?->uwpMfo;
            $fn = $mfo?->uwpFunction;
            if (! $fn || ! $mfo) {
                continue;
            }

            $fnMap[$fn->id] ??= ['id' => $fn->id, 'name' => $fn->name, 'weight' => $fn->weight_percent ?? null, 'mfos' => []];
            $fnMap[$fn->id]['mfos'][$mfo->id] ??= ['id' => $mfo->id, 'title' => $mfo->title, 'indicators' => []];

            $entries = OrsEntry::where('ipcr_item_id', $item->id)
                ->where('status', 'rated')->where('quantity', '>', 0)
                ->whereBetween('work_date', [$period->start_date, $period->end_date])
                ->with('monitoring')->get();
            $totalQty = $entries->sum('quantity');
            $qualPts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
            $timePts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
            $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
            $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;
            $target = is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : null;
            $E = ($target && $target > 0) ? min(5.00, round(($totalQty / $target) * 5, 2)) : $Q;
            $A = ($Q !== null && $T !== null) ? round(($Q + $E + $T) / 3, 2) : null;

            $fnMap[$fn->id]['mfos'][$mfo->id]['indicators'][] = [
                'id' => $item->id,
                'indicator_text' => $indicator->indicator_text,
                'target_timeline' => $indicator->target_timeline,
                'standards' => $indicator->qetStandards->map(fn ($s) => [
                    'dimension' => $s->dimension, 'rating' => $s->rating, 'standard_text' => $s->standard_text,
                ])->values()->all(),
                'ratings' => compact('Q', 'E', 'T', 'A'),
            ];
        }

        foreach ($fnMap as &$fn) {
            $fn['mfos'] = array_values($fn['mfos']);
        }

        return array_values($fnMap);
    }

    /**
     * List the MPORs (monthly POR) for an employee within a period window.
     */
    public function buildMporList(int $employeeId, PerformancePeriod $period): array
    {
        $start = $period->start_date->copy()->startOfMonth();
        $end = $period->end_date->copy()->endOfMonth();

        return Mpor::where('employee_id', $employeeId)
            ->whereBetween('month', [$start->format('Y-m'), $end->format('Y-m')])
            ->orderBy('month')
            ->get()
            ->map(fn (Mpor $m) => [
                'id' => $m->id,
                'month' => $m->month,
                'month_label' => Carbon::createFromFormat('Y-m', $m->month)->format('F Y'),
                'status' => $m->status,
                'submitted_at' => $m->submitted_at?->toIso8601String(),
                'approved_at' => $m->approved_at?->toIso8601String(),
                'endorsed_at' => $m->endorsed_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Derive a skill-gap summary (weakest dimensions + lowest outputs) for an IPCR.
     */
    public function buildSkillGaps(Ipcr $ipcr): array
    {
        [$ratingsByOutput] = app(PerformanceRatingService::class)->buildRatedIpcrPerformanceMaps($ipcr);

        $outputs = [];
        $dimTotals = ['q' => [], 'e' => [], 't' => []];
        foreach ($ratingsByOutput as $title => $r) {
            $outputs[] = [
                'output' => $title,
                'q' => $r['q'], 'e' => $r['e'], 't' => $r['t'], 'a' => $r['a'],
            ];
            foreach (['q', 'e', 't'] as $d) {
                if ($r[$d] !== null) {
                    $dimTotals[$d][] = (float) $r[$d];
                }
            }
        }

        $dimAverages = [];
        foreach (['q' => 'Quality', 'e' => 'Efficiency', 't' => 'Timeliness'] as $key => $label) {
            if (! empty($dimTotals[$key])) {
                $dimAverages[] = [
                    'key' => $key,
                    'label' => $label,
                    'avg' => round(array_sum($dimTotals[$key]) / count($dimTotals[$key]), 2),
                ];
            }
        }
        usort($dimAverages, fn ($a, $b) => $a['avg'] <=> $b['avg']);

        usort($outputs, fn ($a, $b) => ($a['a'] ?? 99) <=> ($b['a'] ?? 99));
        $weakOutputs = array_slice(array_filter($outputs, fn ($o) => $o['a'] !== null && $o['a'] < 3.5), 0, 5);

        return [
            'weak_dimensions' => $dimAverages,
            'weak_outputs' => array_values($weakOutputs),
        ];
    }
}
