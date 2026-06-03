<?php

namespace App\Services;

use App\Models\Opcr;

class OpcrOfficeRatingService
{
    private const CORE_WEIGHT = 0.80;
    private const SUPPORT_WEIGHT = 0.20;

    public function __construct(
        private readonly PerformanceRatingService $ratingService
    ) {
    }

    public function calculate(Opcr $opcr, ?array $outputs = null): array
    {
        $rows = $outputs ?? [];

        return $this->calculateFromOutputs($rows);
    }

    public function calculateFromOutputs(array $outputs): array
    {
        $coreRatings = [];
        $supportRatings = [];

        foreach ($outputs as $output) {
            $rating = $output['actual_avg'] ?? null;
            if (!is_numeric($rating) || (float) $rating <= 0) {
                continue;
            }

            $functionType = strtolower(trim((string) ($output['function_type'] ?? '')));
            if ($functionType === 'core') {
                $coreRatings[] = (float) $rating;
            } elseif ($functionType === 'support') {
                $supportRatings[] = (float) $rating;
            }
        }

        $hasCoreRows = !empty($coreRatings);
        $hasSupportRows = !empty($supportRatings);

        $coreAverage = $hasCoreRows ? round(array_sum($coreRatings) / count($coreRatings), 2) : 0.0;
        $supportAverage = $hasSupportRows ? round(array_sum($supportRatings) / count($supportRatings), 2) : 0.0;

        $coreWeighted = round($coreAverage * self::CORE_WEIGHT, 2);
        $supportWeighted = round($supportAverage * self::SUPPORT_WEIGHT, 2);
        $overallScore = round($coreWeighted + $supportWeighted, 2);
        $isReady = $hasCoreRows || $hasSupportRows;

        return [
            'core_average' => $coreAverage,
            'support_average' => $supportAverage,
            'core_weighted' => $coreWeighted,
            'support_weighted' => $supportWeighted,
            'overall_score' => $overallScore,
            'adjectival_rating' => $isReady
                ? $this->ratingService->resolveAdjectivalRating($overallScore)
                : 'N/A',
            'has_core_rows' => $hasCoreRows,
            'has_support_rows' => $hasSupportRows,
            'is_ready' => $isReady,
            'is_provisional' => $isReady && (!$hasCoreRows || !$hasSupportRows),
        ];
    }
}
