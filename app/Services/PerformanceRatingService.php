<?php

namespace App\Services;

use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\OrsEntry;
use App\Models\Opcr;
use App\Models\AccomplishmentSubmission;
use App\Models\PerformancePeriod;
use App\Models\UwpFunction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class PerformanceRatingService
{
    /**
     * Calculate and save the final score for an IPCR based on its ORS/MPOR ratings.
     */
    public function calculateAndSaveFinalScore(Ipcr $ipcr): float
    {
        // Always recompute — do not use cached final_score
        $score  = $ipcr->pmt_adjusted_score > 0
            ? (float) $ipcr->pmt_adjusted_score
            : $this->calculateComputedScore($ipcr);
        $rating = $this->resolveAdjectivalRating($score);

        $ipcr->update([
            'final_score'      => $score,
            'adjectival_rating' => $rating,
        ]);

        return $score;
    }

    /**
     * Resolve the official score and rating, prioritizing PMT adjustments.
     */
    public function getResolvedScoreAndRating(Ipcr $ipcr): array
    {
        $adjScore = $ipcr->pmt_adjusted_score !== null ? (float) $ipcr->pmt_adjusted_score : 0;
        
        if ($adjScore > 0) {
            $score = $adjScore;
            $rating = $ipcr->pmt_adjusted_rating ?: $this->resolveAdjectivalRating($score);
        } else {
            $score = (float) ($ipcr->final_score ?? 0);
            if ($score <= 0) {
                $score = $this->calculateComputedScore($ipcr);
            }
            $rating = $ipcr->adjectival_rating ?: $this->resolveAdjectivalRating($score);
        }

        return [$score, $rating];
    }

    /**
     * Calculate the weighted computed score for an IPCR.
     * Only includes quarters whose QAR has been approved by PMT.
     * This prevents Q2 ORS data from bleeding into the Q1 score.
     */
    public function calculateComputedScore(Ipcr $ipcr): float
    {
        $period = $ipcr->performancePeriod;
        if (!$period) {
            return $this->computeScoreForWindow($ipcr, null, null);
        }

        $year = $period->start_date->year;

        // Period-relative quarters: Q1 = first 3 months, Q2 = last 3 months.
        // This is consistent regardless of whether the period is Jan-Jun or Jul-Dec.
        $q1Start = Carbon::create($year, $period->start_date->month, 1)->startOfDay();
        $q1End   = $q1Start->copy()->addMonths(2)->endOfMonth()->endOfDay();
        $q2Start = $q1End->copy()->addDay()->startOfDay();
        $q2End   = Carbon::parse($period->end_date)->endOfDay();

        // Keys are always period-relative: "YYYY-Q1" and "YYYY-Q2"
        $q1Key = $year . '-Q1';
        $q2Key = $year . '-Q2';

        // Only score quarters whose QAR has been PMT-approved.
        // office_id is not on the ipcrs table — resolve it from the Employee record.
        $officeId = \App\Models\Employee::where('user_id', $ipcr->employee_id)
            ->value('office_id');

        $approvedQarKeys = \App\Models\QarHeader::where('performance_period_id', $period->id)
            ->where('office_id', $officeId)
            ->where('pmt_status', 'validated')
            ->pluck('quarter_key')
            ->toArray();

        $q1Approved = in_array($q1Key, $approvedQarKeys);
        $q2Approved = in_array($q2Key, $approvedQarKeys);

        $q1Score = $q1Approved ? $this->computeScoreForWindow($ipcr, $q1Start, $q1End) : 0.0;
        $q2Score = $q2Approved ? $this->computeScoreForWindow($ipcr, $q2Start, $q2End) : 0.0;

        if ($q1Score <= 0) return round($q2Score, 2);
        if ($q2Score <= 0) return round($q1Score, 2);

        return round(($q1Score + $q2Score) / 2, 2);
    }

    /**
     * Compute weighted score for a specific date window.
     */
    private function computeScoreForWindow(Ipcr $ipcr, ?Carbon $start, ?Carbon $end): float
    {
        [$ratingsByOutput] = $this->buildRatedIpcrPerformanceMaps($ipcr, $start, $end);

        if (empty($ratingsByOutput)) {
            return 0.0;
        }

        $ipcr->loadMissing('items.indicator.uwpMfo.uwpFunction');

        $functionMap = [];
        foreach ($ipcr->items as $item) {
            $fn = $item->indicator?->uwpMfo?->uwpFunction;
            if (!$fn) continue;
            $fId   = (int) $fn->id;
            $title = strtolower(trim((string) ($item->indicator?->uwpMfo?->title ?? $item->output_title ?? '')));
            if ($title === '') continue;
            if (!isset($functionMap[$fId])) {
                $functionMap[$fId] = ['weight' => (float) ($fn->weight_percent ?? 0), 'titles' => []];
            }
            $functionMap[$fId]['titles'][$title] = true;
        }

        if (empty($functionMap)) return 0.0;

        $totalWeightedScore = 0.0;
        foreach ($functionMap as $fData) {
            $weight = $fData['weight'];
            if ($weight <= 0) continue;
            $outputRatings = [];
            foreach (array_keys($fData['titles']) as $title) {
                if (isset($ratingsByOutput[$title])) {
                    $a = $ratingsByOutput[$title]['a'];
                    if ($a !== null) $outputRatings[] = (float) $a;
                }
            }
            if (!empty($outputRatings)) {
                $functionAvg = array_sum($outputRatings) / count($outputRatings);
                $totalWeightedScore += $functionAvg * ($weight / 100);
            }
        }

        return round($totalWeightedScore, 2);
    }
    /**
     * Resolve adjectival rating label based on numeric score.
     */
    public function resolveAdjectivalRating(float $score): string
    {
        if ($score >= 5.00) return 'Outstanding';
        if ($score >= 4.00) return 'Very Satisfactory';
        if ($score >= 3.00) return 'Satisfactory';
        if ($score >= 2.00) return 'Unsatisfactory';
        return 'Poor';
    }

    /**
     * Build performance maps (Output and Indicator levels) from ORS entries.
     */
    public function buildRatedIpcrPerformanceMaps(Ipcr $ipcr, ?Carbon $windowStart = null, ?Carbon $windowEnd = null): array
    {
        [$startDate, $endDate] = $windowStart && $windowEnd
            ? [$windowStart, $windowEnd]
            : $this->resolveScoringPeriodWindow($ipcr);
        $targetQuantityByOutput = $this->buildTargetQuantityByOutput($ipcr);
        $targetPayloadByIndicator = $this->buildTargetPayloadByIndicatorLookup($ipcr);
        
        $resolvedEmployeeId = (int) ($ipcr->employee_id ?? 0);
        if ($resolvedEmployeeId <= 0) {
            return [[], []];
        }

        $entries = OrsEntry::query()
            ->with([
                'monitoring:ors_entry_id,quality_rating,timeliness_rating',
                'ipcrItem:id,output_title,indicator_text,uwp_success_indicator_id',
                'ipcrItem.indicator:id,uwp_mfo_id,indicator_text',
                'ipcrItem.indicator.uwpMfo:id,title',
            ])
            ->where('employee_id', $resolvedEmployeeId)
            ->where('ipcr_id', $ipcr->id)
            ->where('status', 'rated')
            ->whereBetween('work_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->whereHas('monitoring', function ($query) {
                $query->whereNotNull('quality_rating')
                    ->whereNotNull('timeliness_rating');
            })
            ->get();

        $totalsByOutput = [];
        $totalsByIndicator = [];

        foreach ($entries as $entry) {
            $monitoring = $entry->monitoring->first();
            if (!$monitoring) continue;

            $quantity = (float) ($entry->quantity ?? 0);
            if ($quantity <= 0) continue;

            $outputTitle = strtolower(trim((string) ($entry->ipcrItem?->output_title
                ?? $entry->ipcrItem?->indicator?->uwpMfo?->title
                ?? '')));
            if ($outputTitle === '') $outputTitle = 'unassigned output';

            $qualityPoints = $quantity * (float) $monitoring->quality_rating;
            $timelinessPoints = $quantity * (float) $monitoring->timeliness_rating;

            if (!isset($totalsByOutput[$outputTitle])) {
                $totalsByOutput[$outputTitle] = ['qty' => 0.0, 'q_points' => 0.0, 't_points' => 0.0];
            }
            $totalsByOutput[$outputTitle]['qty'] += $quantity;
            $totalsByOutput[$outputTitle]['q_points'] += $qualityPoints;
            $totalsByOutput[$outputTitle]['t_points'] += $timelinessPoints;

            $indicatorId = (int) ($entry->ipcrItem?->uwp_success_indicator_id ?? 0);
            if ($indicatorId > 0) {
                if (!isset($totalsByIndicator[$indicatorId])) {
                    $totalsByIndicator[$indicatorId] = [
                        'indicator_id' => $indicatorId,
                        'output' => $outputTitle,
                        'indicator_text' => trim((string) ($entry->ipcrItem?->indicator?->indicator_text
                            ?? $entry->ipcrItem?->indicator_text
                            ?? '')),
                        'qty' => 0.0,
                        'q_points' => 0.0,
                        't_points' => 0.0,
                    ];
                }
                $totalsByIndicator[$indicatorId]['qty'] += $quantity;
                $totalsByIndicator[$indicatorId]['q_points'] += $qualityPoints;
                $totalsByIndicator[$indicatorId]['t_points'] += $timelinessPoints;
            }
        }

        $ratingsByOutput = [];
        foreach ($totalsByOutput as $outputTitle => $totals) {
            $ratings = $this->buildPerformanceRatings(
                (float) $totals['qty'],
                (float) $totals['q_points'],
                (float) $totals['t_points'],
                $targetQuantityByOutput[$outputTitle] ?? null
            );
            if ($ratings) $ratingsByOutput[$outputTitle] = $ratings;
        }

        $ratingsByIndicator = [];
        foreach ($totalsByIndicator as $indicatorId => $totals) {
            $ratings = $this->buildPerformanceRatings(
                (float) $totals['qty'],
                (float) $totals['q_points'],
                (float) $totals['t_points'],
                $targetPayloadByIndicator[$indicatorId]['target_quantity'] ?? null
            );
            if ($ratings) {
                $ratingsByIndicator[$indicatorId] = [
                    ...$ratings,
                    'indicator_id' => (int) $indicatorId,
                    'output_title' => $totals['output'] ?? null,
                    'indicator_text' => $totals['indicator_text'] ?? null,
                ];
            }
        }

        return [$ratingsByOutput, $ratingsByIndicator];
    }

    /**
     * Build consolidated office-level ratings for all OPCR outputs using the
     * employee IPCRs linked to the supplied OPCR.
     */
    public function buildConsolidatedOfficeOutputRatings(Opcr $opcr): array
    {
        $opcr->loadMissing('uwps.uwpFunctions.mfos.successIndicators.assignments.employee');

        $indicatorMeta = [];
        foreach ($opcr->uwps as $uwp) {
            foreach ($uwp->uwpFunctions as $fn) {
                $functionType = strtolower((string) ($fn->function_type ?? 'core'));
                $weightPercent = is_numeric($fn->weight_percent) ? (float) $fn->weight_percent : null;

                foreach ($fn->mfos as $mfo) {
                    $outputTitle = trim((string) $mfo->title);
                    if ($outputTitle === '') {
                        continue;
                    }

                    foreach ($mfo->successIndicators as $si) {
                        $indicatorText = trim((string) $si->indicator_text);
                        $indicatorId = (int) $si->id;
                        if ($indicatorId <= 0) {
                            continue;
                        }

                        $indicatorMeta[$indicatorId] ??= [
                            'indicator_id' => $indicatorId,
                            'lookup_key' => $outputTitle . '||' . $indicatorText,
                            'function_type' => $functionType,
                            'weight_percent' => $weightPercent,
                            'output_title' => $outputTitle,
                            'indicator_text' => $indicatorText,
                            'assigned' => $si->assignments->isNotEmpty(),
                        ];
                    }
                }
            }
        }

        $scoreTotals = [];

        $submissions = AccomplishmentSubmission::query()
            ->with([
                'ipcr.items.indicator.uwpMfo.uwpFunction',
                'ipcr.performancePeriod',
            ])
            ->where('office_id', $opcr->office_id)
            ->where('performance_period_id', $opcr->performance_period_id)
            ->where('status', 'released_by_pmt')
            ->get();

        if ($submissions->isEmpty()) {
            return [];
        }

        foreach ($submissions as $submission) {
            $ipcr = $submission->ipcr;
            if (! $ipcr) {
                continue;
            }

            [, $ratingsByIndicator] = $this->buildRatedIpcrPerformanceMaps($ipcr);

            foreach ($ratingsByIndicator as $indicatorId => $ratings) {
                $indicatorId = (int) ($ratings['indicator_id'] ?? $indicatorId);
                if ($indicatorId <= 0) {
                    continue;
                }

                $qty = (float) ($ratings['qty'] ?? 0);
                if ($qty <= 0) {
                    continue;
                }

                $scoreTotals[$indicatorId] ??= [
                    'qty' => 0.0,
                    'q_points' => 0.0,
                    't_points' => 0.0,
                    'target_qty' => 0.0,
                ];

                $scoreTotals[$indicatorId]['qty'] += $qty;
                $scoreTotals[$indicatorId]['q_points'] += $qty * (float) ($ratings['q'] ?? 0);
                $scoreTotals[$indicatorId]['t_points'] += $qty * (float) ($ratings['t'] ?? 0);
                $scoreTotals[$indicatorId]['target_qty'] += (float) ($ratings['target_qty'] ?? 0);
            }
        }

        $result = [];

        foreach ($indicatorMeta as $indicatorId => $meta) {
            $totals = $scoreTotals[$indicatorId] ?? [
                'qty' => 0.0,
                'q_points' => 0.0,
                't_points' => 0.0,
                'target_qty' => 0.0,
            ];
            $qty = (float) $totals['qty'];
            $targetQty = (float) $totals['target_qty'];

            if ($qty <= 0 || $targetQty <= 0) {
                $result[$indicatorId] = [
                    ...$meta,
                    'qty' => 0.0,
                    'target_qty' => $targetQty,
                    'q' => 0,
                    'e' => 0,
                    't' => 0,
                    'a' => 0,
                ];
                continue;
            }

            $q = round(((float) $totals['q_points']) / $qty, 2);
            $t = round(((float) $totals['t_points']) / $qty, 2);
            $e = round(min(5.0, 5.0 * ($qty / $targetQty)), 2);
            $a = round(($q + $e + $t) / 3, 2);

            $result[$indicatorId] = [
                ...$meta,
                'qty' => round($qty, 2),
                'target_qty' => round($targetQty, 2),
                'q' => $q,
                'e' => $e,
                't' => $t,
                'a' => $a,
            ];
        }

        return $result;
    }

    private function buildPerformanceRatings(float $qty, float $qPoints, float $tPoints, mixed $targetQty): ?array
    {
        if ($qty <= 0) return null;

        $resolvedTarget = is_numeric($targetQty) ? (float) $targetQty : 0.0;
        
        // Quality (Q) is the average of quality ratings from monitoring.
        $q = round($qPoints / $qty, 2);
        
        // Efficiency (E) is the ratio of actual vs target quantity (scaled to 5).
        $e = ($qty <= 0 || $resolvedTarget <= 0) ? null : round(min(5.0, 5.0 * ($qty / $resolvedTarget)), 2);
        
        // Timeliness (T) is the average of timeliness ratings from monitoring.
        $t = round($tPoints / $qty, 2);
        
        $a = $e !== null && $t !== null ? ($q !== null ? round(($q + $e + $t) / 3, 2) : round(($e + $t) / 2, 2)) : null;

        return ['qty' => $qty, 'target_qty' => $resolvedTarget, 'q' => $q, 'e' => $e, 't' => $t, 'a' => $a];
    }

    private function resolveScoringPeriodWindow(Ipcr $ipcr): array
    {
        $start = Carbon::parse($ipcr->performancePeriod?->start_date ?? now()->startOfMonth());
        $end = Carbon::parse($ipcr->performancePeriod?->end_date ?? now()->endOfMonth());
        return [$start->startOfDay(), $end->endOfDay()];
    }

    private function buildTargetQuantityByOutput(Ipcr $ipcr): array
    {
        $ipcr->loadMissing('items.indicator.uwpMfo');
        $targets = [];
        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo = $indicator?->uwpMfo;
            if (!$mfo) continue;
            $title = strtolower(trim((string) $mfo->title));
            if ($title === '') continue;
            // Sum indicator targets per MFO output
            $qty = is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : 0.0;
            $targets[$title] = ($targets[$title] ?? 0.0) + $qty;
        }
        return $targets;
    }

    private function buildTargetPayloadByIndicatorLookup(Ipcr $ipcr): array
    {
        $ipcr->loadMissing('items.indicator.uwpMfo');
        $targets = [];
        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo = $indicator?->uwpMfo;
            if (!$mfo || !$indicator) continue;
            $indicatorId = (int) $indicator->id;
            if ($indicatorId <= 0) {
                continue;
            }
            $targets[$indicatorId] ??= [
                'target_quantity' => 0.0,
            ];
            $targets[$indicatorId]['target_quantity'] += is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : 0.0;
        }
        return $targets;
    }
}
