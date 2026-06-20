<?php

namespace App\Services;

use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\OrsEntry;
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
     * Uses per-quarter averaging: Q1 score and Q2 score are averaged equally.
     */
    public function calculateComputedScore(Ipcr $ipcr): float
    {
        $period = $ipcr->performancePeriod;
        if (!$period) {
            return $this->computeScoreForWindow($ipcr, null, null);
        }

        $year = $period->start_date->year;

        // Q1: months 1-3, Q2: months 4-6 of the period
        $q1Start = Carbon::create($year, $period->start_date->month, 1)->startOfDay();
        $q1End   = $q1Start->copy()->addMonths(2)->endOfMonth()->endOfDay();
        $q2Start = $q1End->copy()->addDay()->startOfDay();
        $q2End   = Carbon::parse($period->end_date)->endOfDay();

        $q1Score = $this->computeScoreForWindow($ipcr, $q1Start, $q1End);
        $q2Score = $this->computeScoreForWindow($ipcr, $q2Start, $q2End);

        // If only one quarter has data, use that quarter's score
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
            $title = trim((string) ($item->indicator?->uwpMfo?->title ?? $item->output_title ?? ''));
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
        if ($score >= 4.50) return 'Outstanding';
        if ($score >= 3.50) return 'Very Satisfactory';
        if ($score >= 2.50) return 'Satisfactory';
        if ($score >= 1.50) return 'Unsatisfactory';
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

            $outputTitle = trim((string) ($entry->ipcrItem?->output_title
                ?? $entry->ipcrItem?->indicator?->uwpMfo?->title
                ?? ''));
            if ($outputTitle === '') $outputTitle = 'Unassigned Output';

            $qualityPoints = $quantity * (float) $monitoring->quality_rating;
            $timelinessPoints = $quantity * (float) $monitoring->timeliness_rating;

            if (!isset($totalsByOutput[$outputTitle])) {
                $totalsByOutput[$outputTitle] = ['qty' => 0.0, 'q_points' => 0.0, 't_points' => 0.0];
            }
            $totalsByOutput[$outputTitle]['qty'] += $quantity;
            $totalsByOutput[$outputTitle]['q_points'] += $qualityPoints;
            $totalsByOutput[$outputTitle]['t_points'] += $timelinessPoints;

            $indicatorText = trim((string) ($entry->ipcrItem?->indicator_text
                ?? $entry->ipcrItem?->indicator?->indicator_text
                ?? ''));
            if ($indicatorText !== '') {
                $lookupKey = $outputTitle . '||' . $indicatorText;
                if (!isset($totalsByIndicator[$lookupKey])) {
                    $totalsByIndicator[$lookupKey] = ['output' => $outputTitle, 'qty' => 0.0, 'q_points' => 0.0, 't_points' => 0.0];
                }
                $totalsByIndicator[$lookupKey]['qty'] += $quantity;
                $totalsByIndicator[$lookupKey]['q_points'] += $qualityPoints;
                $totalsByIndicator[$lookupKey]['t_points'] += $timelinessPoints;
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
        foreach ($totalsByIndicator as $lookupKey => $totals) {
            $ratings = $this->buildPerformanceRatings(
                (float) $totals['qty'],
                (float) $totals['q_points'],
                (float) $totals['t_points'],
                $targetPayloadByIndicator[$lookupKey]['target_quantity'] ?? null
            );
            if ($ratings) $ratingsByIndicator[$lookupKey] = $ratings;
        }

        return [$ratingsByOutput, $ratingsByIndicator];
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

        return ['qty' => $qty, 'q' => $q, 'e' => $e, 't' => $t, 'a' => $a];
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
            $title = trim((string) $mfo->title);
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
            $outputTitle = trim((string) $mfo->title);
            $text = trim((string) ($indicator->indicator_text ?? ''));
            if ($outputTitle !== '' && $text !== '') {
                $targets[$outputTitle . '||' . $text] = [
                    'target_quantity' => is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : 0.0,
                ];
            }
        }
        return $targets;
    }
}
