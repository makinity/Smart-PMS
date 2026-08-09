<?php

namespace App\Services;

use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Consolidates Annex I (Quarterly Physical Report of Operations) rows from the
 * approved MPORs of an office within a given quarter. Shared by the Dept-Head
 * QAR page and the QAR export so both render identical data.
 */
class QarConsolidationService
{
    /**
     * The three calendar months that make up quarter $q of a 6-month period.
     * Q1 maps to the first 3 months of the period, Q2 to the last 3.
     *
     * For Jan-Jun: Q1 = Jan-Mar, Q2 = Apr-Jun
     * For Jul-Dec: Q1 = Jul-Sep, Q2 = Oct-Dec
     *
     * @return Carbon[]
     */
    public function quarterMonths(PerformancePeriod $period, int $q): array
    {
        $startMonth = $period->start_date->month;
        $startYear  = $period->start_date->year;

        // Offset within the period: Q1 starts at month 0, Q2 starts at month 3
        $offset = ($q - 1) * 3;

        // Calculate the actual calendar month, wrapping year if needed
        $m1 = Carbon::create($startYear, $startMonth, 1)->addMonths($offset);

        return [
            $m1->copy()->startOfMonth(),
            $m1->copy()->addMonth()->startOfMonth(),
            $m1->copy()->addMonths(2)->startOfMonth(),
        ];
    }

    /**
     * Returns the period-relative quarter key, always Q1 or Q2.
     * Q1 = first 3 months of the period, Q2 = last 3 months.
     *
     * Jan-Jun → Q1 = "2026-Q1", Q2 = "2026-Q2"
     * Jul-Dec → Q1 = "2026-Q1", Q2 = "2026-Q2"  (period-relative, not calendar)
     */
    public function quarterKey(PerformancePeriod $period, int $q): string
    {
        return $period->start_date->year . '-Q' . $q;
    }

    /**
     * Consolidate Annex I rows from approved MPORs in a quarter.
     *
     * @return array{rows: array<int, array<string, mixed>>, mpors: Collection}
     */
    public function consolidate(int $officeId, PerformancePeriod $period, int $q): array
    {
        $months = $this->quarterMonths($period, $q);
        $monthStrings = array_map(fn ($m) => $m->format('Y-m'), $months);

        $mpors = Mpor::where('office_id', $officeId)
            ->where('status', 'approved')
            ->whereIn('month', $monthStrings)
            ->with(['employee'])
            ->get();

        if ($mpors->isEmpty()) {
            return ['rows' => [], 'mpors' => $mpors];
        }

        $rows = [];
        $sort = 0;

        foreach ($mpors as $mpor) {
            $start = Carbon::parse($mpor->month.'-01')->startOfMonth();
            $end = $start->copy()->endOfMonth();

            $entries = OrsEntry::with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
                ->where('employee_id', $mpor->employee_id)
                ->where('status', 'rated')
                ->where('quantity', '>', 0)
                ->whereBetween('work_date', [$start, $end])
                ->get()
                ->filter(fn ($e) => ($m = $e->monitoring->first()) && $m->quality_rating !== null && $m->timeliness_rating !== null);

            foreach ($entries as $entry) {
                $item = $entry->ipcrItem;
                $indicator = $item?->indicator;
                if (! $indicator) {
                    continue;
                }

                $mfo = $indicator->uwpMfo;
                $rowKey = $item->id.'_'.strtolower(trim($indicator->indicator_text ?? ''));

                if (! isset($rows[$rowKey])) {
                    $rows[$rowKey] = [
                        'ppa_code' => (string) $item->id,
                        'mfo_title' => $mfo?->title ?? 'Unknown',
                        'indicator_text' => $indicator->indicator_text ?? '',
                        'target_quantity' => is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : null,
                        'target_timeline' => $indicator->target_timeline ?? '',
                        'actual_performance' => 0,
                        'variance' => null,
                        'remarks' => 'Consolidated from multiple employee MPORs',
                        'sort_order' => $sort++,
                    ];
                }
                $rows[$rowKey]['actual_performance'] += (int) $entry->quantity;
            }
        }

        foreach ($rows as &$row) {
            if ($row['target_quantity'] !== null) {
                $row['variance'] = $row['actual_performance'] - $row['target_quantity'];
            }
        }
        unset($row);

        return [
            'rows' => array_values($rows),
            'mpors' => $mpors,
        ];
    }
}
