<?php

namespace App\Observers;

use App\Models\EmployeePerformanceSnapshot;
use App\Models\Ipcr;
use App\Models\IpcrItem;

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

        $officeSize = $ipcr->employee?->office_id
            ? \App\Models\User::where('office_id', $ipcr->employee->office_id)->count()
            : null;

        foreach ($ipcr->items as $item) {
            $function = $item->indicator?->uwpMfo?->uwpFunction;

            // Parse timeline to days (e.g. "5 days", "2 weeks")
            $timelineDays = $item->target_timeline
                ? self::parseDays($item->target_timeline)
                : null;

            EmployeePerformanceSnapshot::updateOrCreate(
                [
                    'employee_id'           => $ipcr->employee_id,
                    'performance_period_id' => $ipcr->performance_period_id,
                    'ipcr_id'               => $ipcr->id,
                ],
                [
                    'indicator_text'           => $item->indicator_text,
                    'function_type'            => $function?->function_type,
                    'mfo_title'                => $item->indicator?->uwpMfo?->title,
                    'target_quantity'          => $item->target_quantity,
                    'target_timeline_days'     => $timelineDays,
                    'office_size'              => $officeSize,
                    'employee_count_assigned'  => $item->indicator
                        ? $item->indicator->assignments()->count()
                        : null,
                    'final_score'              => $ipcr->pmt_adjusted_score ?? $ipcr->final_score,
                    'adjectival_rating'        => $ipcr->pmt_adjusted_rating ?? $ipcr->adjectival_rating,
                ]
            );
        }
    }

    private static function parseDays(?string $timeline): ?int
    {
        if (! $timeline) return null;
        if (preg_match('/(\d+)\s*day/i', $timeline, $m)) return (int) $m[1];
        if (preg_match('/(\d+)\s*week/i', $timeline, $m)) return (int) $m[1] * 7;
        if (preg_match('/(\d+)\s*month/i', $timeline, $m)) return (int) $m[1] * 30;
        if (preg_match('/\d+/', $timeline, $m)) return (int) $m[0]; // fallback: bare number
        return null;
    }
}
