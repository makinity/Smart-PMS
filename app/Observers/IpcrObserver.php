<?php

namespace App\Observers;

use App\Models\EmployeePerformanceSnapshot;
use App\Models\Ipcr;

class IpcrObserver
{
    /**
     * Populate snapshot rows when PMT releases an IPCR.
     * Each ipcr_item becomes one snapshot row (one row per indicator per employee per period).
     */
    public function updated(Ipcr $ipcr): void
    {
        if ($ipcr->status !== Ipcr::STATUS_RELEASED_BY_PMT) {
            return;
        }

        $ipcr->loadMissing([
            'items.indicator.uwpMfo.uwpFunction',
            'employee.office',
        ]);

        $employee   = $ipcr->employee;
        $officeSize = $employee?->office_id
            ? \App\Models\User::where('office_id', $employee->office_id)->count()
            : null;

        // Previous period snapshot for trend feature
        $prevSnapshot = $employee
            ? EmployeePerformanceSnapshot::where('employee_id', $employee->id)
                ->where('performance_period_id', '<', $ipcr->performance_period_id)
                ->orderByDesc('performance_period_id')
                ->first()
            : null;

        // Current workload: how many indicators already assigned this period
        $currentWorkload = $employee
            ? \App\Models\UwpIndicatorAssignment::where('employee_id', $employee->id)
                ->whereHas('indicator.uwpMfo.unitWorkPlan', fn ($q) =>
                    $q->where('performance_period_id', $ipcr->performance_period_id)
                )
                ->count()
            : null;

        // Was flagged for calibration this period
        $flagged = \App\Models\AccomplishmentSubmission::where('employee_id', $ipcr->employee_id)
            ->where('performance_period_id', $ipcr->performance_period_id)
            ->where('dept_head_flagged_for_calibration', true)
            ->exists();

        $finalScore = $ipcr->pmt_adjusted_score ?? $ipcr->final_score;

        foreach ($ipcr->items as $item) {
            $function = $item->indicator?->uwpMfo?->uwpFunction;

            EmployeePerformanceSnapshot::updateOrCreate(
                [
                    'employee_id'           => $ipcr->employee_id,
                    'performance_period_id' => $ipcr->performance_period_id,
                    'ipcr_id'               => $ipcr->id,
                ],
                [
                    // Employee context
                    'position'                    => $employee?->position,
                    'office_name'                 => $employee?->office?->name,

                    // Indicator context
                    'uwp_success_indicator_id'    => $item->indicator_id,
                    'indicator_text'              => $item->indicator_text,
                    'function_type'               => $function?->function_type,
                    'mfo_title'                   => $item->indicator?->uwpMfo?->title,
                    'target_quantity'             => $item->target_quantity,
                    'target_timeline_days'        => self::parseDays($item->target_timeline),

                    // Office/workload context
                    'office_size'                 => $officeSize,
                    'employee_count_assigned'     => $item->indicator
                        ? $item->indicator->assignments()->count()
                        : null,
                    'current_workload_count'      => $currentWorkload,

                    // Previous period trend
                    'previous_final_score'        => $prevSnapshot?->final_score,
                    'previous_adjectival_rating'  => $prevSnapshot?->adjectival_rating,

                    // Calibration signal
                    'was_flagged_for_calibration' => $flagged,

                    // Outcome (ML label)
                    'final_score'                 => $finalScore,
                    'adjectival_rating'           => $ipcr->pmt_adjusted_rating ?? $ipcr->adjectival_rating,
                    'feasibility_label'           => self::toFeasibilityLabel($finalScore),
                ]
            );
        }
    }

    public static function toFeasibilityLabel(?float $score): ?string
    {
        if ($score === null) return null;
        if ($score >= 4.0)   return 'achievable';
        if ($score >= 3.0)   return 'at_risk';
        return 'unrealistic';
    }

    private static function parseDays(?string $timeline): ?int
    {
        if (!$timeline) return null;
        if (preg_match('/(\d+)\s*day/i',   $timeline, $m)) return (int) $m[1];
        if (preg_match('/(\d+)\s*week/i',  $timeline, $m)) return (int) $m[1] * 7;
        if (preg_match('/(\d+)\s*month/i', $timeline, $m)) return (int) $m[1] * 30;
        if (preg_match('/\d+/', $timeline, $m))             return (int) $m[0];
        return null;
    }
}
