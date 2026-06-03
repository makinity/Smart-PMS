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
        [$finalScore, $finalRating] = $this->getResolvedScoreAndRating($ipcr);
        
        $ipcr->update([
            'final_score' => $finalScore,
            'adjectival_rating' => $finalRating,
        ]);

        return $finalScore;
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
     */
    public function calculateComputedScore(Ipcr $ipcr): float
    {
        [$ratingsByOutput, $ratingsByIndicator] = $this->buildRatedIpcrPerformanceMaps($ipcr);
        
        if (empty($ratingsByOutput)) {
            return 0.0;
        }

        $ipcr->loadMissing('unitWorkPlan.uwpFunctions');
        $functions = $ipcr->unitWorkPlan?->uwpFunctions ?? collect();

        if ($functions->isEmpty()) {
            return 0.0;
        }

        $totalWeightedScore = 0.0;
        
        // Group output titles by function_id using the ipcr items
        $outputTitlesByFunction = [];
        foreach ($ipcr->items ?? [] as $item) {
            $fId = (int) $item->uwp_function_id;
            $title = trim((string) $item->output_title);
            if ($title !== '') {
                $outputTitlesByFunction[$fId][$title] = true;
            }
        }

        foreach ($functions as $function) {
            $fId = (int) $function->id;
            $weight = (float) ($function->weight_percent ?? 0);
            if ($weight <= 0) continue;

            $titles = array_keys($outputTitlesByFunction[$fId] ?? []);
            if (empty($titles)) continue;

            $outputRatings = [];
            foreach ($titles as $title) {
                if (isset($ratingsByOutput[$title])) {
                    $outputRatings[] = (float) $ratingsByOutput[$title]['a'];
                }
            }

            if (!empty($outputRatings)) {
                $functionAvg = array_sum($outputRatings) / count($outputRatings);
                $totalWeightedScore += ($functionAvg * ($weight / 100));
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
    public function buildRatedIpcrPerformanceMaps(Ipcr $ipcr): array
    {
        [$startDate, $endDate] = $this->resolveScoringPeriodWindow($ipcr);
        $targetQuantityByOutput = $this->buildTargetQuantityByOutput($ipcr);
        $targetPayloadByIndicator = $this->buildTargetPayloadByIndicatorLookup($ipcr);
        
        $resolvedEmployeeId = (int) ($ipcr->employee_id ?? 0);
        if ($resolvedEmployeeId <= 0) {
            return [[], []];
        }

        $entries = OrsEntry::query()
            ->with([
                'monitoring:ors_entry_id,quality_rating,timeliness_rating',
                'ipcrItem:id,output_title,indicator_text',
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
            $monitoring = $entry->monitoring;
            if (!$monitoring) continue;

            $quantity = (float) ($entry->quantity ?? 0);
            if ($quantity <= 0) continue;

            $outputTitle = trim((string) ($entry->ipcrItem?->output_title ?? ''));
            if ($outputTitle === '') $outputTitle = 'Unassigned Output';

            $qualityPoints = $quantity * (float) $monitoring->quality_rating;
            $timelinessPoints = $quantity * (float) $monitoring->timeliness_rating;

            if (!isset($totalsByOutput[$outputTitle])) {
                $totalsByOutput[$outputTitle] = ['qty' => 0.0, 'q_points' => 0.0, 't_points' => 0.0];
            }
            $totalsByOutput[$outputTitle]['qty'] += $quantity;
            $totalsByOutput[$outputTitle]['q_points'] += $qualityPoints;
            $totalsByOutput[$outputTitle]['t_points'] += $timelinessPoints;

            $indicatorText = trim((string) ($entry->ipcrItem?->indicator_text ?? ''));
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
        $ipcr->loadMissing('unitWorkPlan.uwpFunctions.mfos');
        $targets = [];
        foreach ($ipcr->unitWorkPlan?->uwpFunctions ?? [] as $function) {
            foreach ($function->mfos ?? [] as $mfo) {
                $title = trim((string) ($mfo->title ?? ''));
                if ($title !== '') {
                    $targets[$title] = is_numeric($mfo->target_quantity) ? (float) $mfo->target_quantity : 0.0;
                }
            }
        }
        return $targets;
    }

    private function buildTargetPayloadByIndicatorLookup(Ipcr $ipcr): array
    {
        $ipcr->loadMissing('unitWorkPlan.uwpFunctions.mfos.successIndicators');
        $targets = [];
        foreach ($ipcr->unitWorkPlan?->uwpFunctions ?? [] as $function) {
            foreach ($function->mfos ?? [] as $mfo) {
                $outputTitle = trim((string) ($mfo->title ?? ''));
                foreach ($mfo->successIndicators ?? [] as $indicator) {
                    $text = trim((string) ($indicator->indicator_text ?? ''));
                    if ($outputTitle !== '' && $text !== '') {
                        $targets[$outputTitle . '||' . $text] = [
                            'target_quantity' => is_numeric($indicator->target_quantity ?? $mfo->target_quantity) ? (float) ($indicator->target_quantity ?? $mfo->target_quantity) : 0.0
                        ];
                    }
                }
            }
        }
        return $targets;
    }
}
