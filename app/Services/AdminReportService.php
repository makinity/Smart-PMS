<?php

namespace App\Services;

use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\Office;
use App\Models\Opcr;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\Smpor;
use App\Models\UnitWorkPlan;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class AdminReportService
{
    public const REPORTS = [
        'uwp' => 'Unit Work Plan',
        'opcr' => 'Office Performance Commitment and Review',
        'ipcr' => 'Individual Performance Commitment and Review',
        'ors' => 'Output Rating Sheet',
        'mpor' => 'Monthly Performance Output Report',
        'qar' => 'Quarterly Accomplishment Report',
        'smpor' => 'Summary Monthly Performance Output Report',
    ];

    public function definitions(): array
    {
        return collect(self::REPORTS)->map(
            static fn (string $label, string $slug): array => ['slug' => $slug, 'label' => $label]
        )->values()->all();
    }

    public function exists(string $slug): bool
    {
        return array_key_exists($slug, self::REPORTS);
    }

    public function label(string $slug): string
    {
        return self::REPORTS[$slug] ?? Str::upper($slug);
    }

    public function makePreviewResponse(string $slug, PerformancePeriod $period, Office $office): Response
    {
        [$view, $payload, $filename, $paper] = $this->buildDocument($slug, $period, $office);

        return Pdf::loadView($view, $payload)
            ->setPaper($paper[0], $paper[1])
            ->stream($filename);
    }

    public function makeDownloadResponse(string $slug, PerformancePeriod $period, Office $office): Response
    {
        [$view, $payload, $filename, $paper] = $this->buildDocument($slug, $period, $office);

        return Pdf::loadView($view, $payload)
            ->setPaper($paper[0], $paper[1])
            ->download($filename);
    }

    private function buildDocument(string $slug, PerformancePeriod $period, Office $office): array
    {
        return match ($slug) {
            'uwp' => $this->buildUwpDocument($period, $office),
            'opcr' => $this->buildOpcrDocument($period, $office),
            'ipcr' => $this->buildIpcrDocument($period, $office),
            'ors' => $this->buildOrsDocument($period, $office),
            'mpor' => $this->buildMporDocument($period, $office),
            'qar' => $this->buildQarDocument($period, $office),
            'smpor' => $this->buildSmporDocument($period, $office),
            default => throw new AdminReportException('Invalid report type selected.'),
        };
    }

    private function buildUwpDocument(PerformancePeriod $period, Office $office): array
    {
        $uwp = UnitWorkPlan::query()
            ->with([
                'office.head:id,name',
                'creator:id,name',
                'uwpFunctions' => function ($query): void {
                    $query->orderBy('sort_order')
                        ->with([
                            'mfos' => function ($mfoQuery): void {
                                $mfoQuery->orderBy('sort_order')
                                    ->with([
                                        'successIndicators' => function ($indicatorQuery): void {
                                            $indicatorQuery->orderBy('sort_order')->with('qetStandards');
                                        },
                                    ]);
                            },
                        ]);
                },
            ])
            ->where('office_id', $office->id)
            ->where('performance_period_id', $period->id)
            ->orderByDesc('approved_at')
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->first();

        if (!$uwp) {
            throw new AdminReportException('No UWP data found for the selected office and performance period.');
        }

        $outputs = [];

        foreach ($uwp->uwpFunctions as $function) {
            foreach ($function->mfos as $mfo) {
                $indicatorStandards = [];
                $successIndicators = [];

                foreach ($mfo->successIndicators as $indicator) {
                    $successIndicators[] = (string) $indicator->indicator_text;
                    $ratings = [];

                    foreach ($indicator->qetStandards as $standard) {
                        $rating = (int) ($standard->rating ?? 0);
                        if (!isset($ratings[$rating])) {
                            $ratings[$rating] = ['q' => [], 'e' => [], 't' => []];
                        }

                        $dimension = strtolower((string) $standard->dimension);
                        if (isset($ratings[$rating][$dimension])) {
                            $ratings[$rating][$dimension][] = (string) $standard->standard_text;
                        }
                    }

                    $indicatorStandards[(string) $indicator->indicator_text] = $ratings;
                }

                $weight = (float) ($function->weight_percent ?? $mfo->weight_percent ?? 0);
                $outputs[] = [
                    'mfo' => (string) $mfo->title,
                    'success_indicators' => $successIndicators,
                    'function' => $this->formatFunctionLabel((string) $function->function_type, $weight),
                    'function_type' => strtolower((string) $function->function_type),
                    'indicator_standards' => $indicatorStandards,
                ];
            }
        }

        return [
            'pdf.admin.uwp',
            [
                'officeName' => (string) $office->name,
                'supervisorName' => (string) ($uwp->creator?->name ?? 'N/A'),
                'deptHeadName' => (string) ($office->head?->name ?? 'N/A'),
                'periodLabel' => $this->formatPeriodRange($period),
                'outputs' => $outputs,
            ],
            $this->makeFilename('uwp', $period, $office),
            ['a4', 'landscape'],
        ];
    }

    private function buildOpcrDocument(PerformancePeriod $period, Office $office): array
    {
        $opcr = Opcr::query()
            ->with([
                'office.head:id,name',
                'sourceUnitWorkPlans.uwpFunctions' => function ($query): void {
                    $query->orderBy('sort_order')->with([
                        'mfos' => function ($mfoQuery): void {
                            $mfoQuery->orderBy('sort_order')->with('successIndicators');
                        },
                    ]);
                },
                'unitWorkPlan.uwpFunctions' => function ($query): void {
                    $query->orderBy('sort_order')->with([
                        'mfos' => function ($mfoQuery): void {
                            $mfoQuery->orderBy('sort_order')->with('successIndicators');
                        },
                    ]);
                },
            ])
            ->where('office_id', $office->id)
            ->where('performance_period_id', $period->id)
            ->orderByDesc('approved_at')
            ->orderByDesc('submitted_at')
            ->orderByDesc('id')
            ->first();

        if (!$opcr) {
            throw new AdminReportException('No OPCR data found for the selected office and performance period.');
        }

        $sourceUwps = $opcr->sourceUnitWorkPlans();
        if ($sourceUwps->isEmpty() && $opcr->unitWorkPlan) {
            $sourceUwps = collect([$opcr->unitWorkPlan]);
        }

        $outputs = [];
        foreach ($sourceUwps as $uwp) {
            foreach ($uwp->uwpFunctions as $function) {
                foreach ($function->mfos as $mfo) {
                    foreach ($mfo->successIndicators as $indicator) {
                        $outputs[] = [
                            'mfo' => (string) $mfo->title,
                            'success_indicator' => (string) $indicator->indicator_text,
                            'budget' => '',
                            'accountable' => (string) $office->name,
                            'standard' => (string) ($indicator->target_timeline ?: $indicator->target_quantity),
                            'function_type' => strtolower((string) $function->function_type),
                        ];
                    }
                }
            }
        }

        if ($outputs === []) {
            throw new AdminReportException('The selected OPCR does not contain reportable outputs.');
        }

        return [
            'pdf.admin.opcr',
            [
                'officeName' => (string) $office->name,
                'officeHeadName' => (string) ($office->head?->name ?? 'N/A'),
                'deptHeadName' => (string) ($office->head?->name ?? 'N/A'),
                'periodLabel' => $this->formatPeriodRange($period),
                'outputs' => $outputs,
            ],
            $this->makeFilename('opcr', $period, $office),
            ['legal', 'landscape'],
        ];
    }

    private function buildIpcrDocument(PerformancePeriod $period, Office $office): array
    {
        $ipcrs = Ipcr::query()
            ->with([
                'employee:id,name',
                'items' => function ($query): void {
                    $query->orderBy('function_type')->orderBy('output_title')->orderBy('id');
                },
            ])
            ->where('office_id', $office->id)
            ->where('performance_period_id', $period->id)
            ->orderBy('employee_id')
            ->orderByDesc('finalized_at')
            ->orderByDesc('committed_at')
            ->orderByDesc('id')
            ->get()
            ->groupBy('employee_id')
            ->map(static fn (Collection $rows): mixed => $rows->first())
            ->values();

        if ($ipcrs->isEmpty()) {
            throw new AdminReportException('No IPCR data found for the selected office and performance period.');
        }

        $employees = $ipcrs->map(function (Ipcr $ipcr): array {
            $grouped = $ipcr->items->groupBy(
                static fn ($item): string => strtolower((string) ($item->function_type ?? 'support'))
            );

            return [
                'employee_name' => (string) ($ipcr->employee?->name ?? 'Unknown Employee'),
                'position' => (string) ($ipcr->employee?->position ?? 'N/A'),
                'status' => (string) $ipcr->status,
                'final_score' => $ipcr->final_score !== null ? number_format((float) $ipcr->final_score, 2) : 'N/A',
                'adjectival_rating' => (string) ($ipcr->adjectival_rating ?? 'N/A'),
                'core_items' => $this->mapIpcrItems($grouped->get('core', collect())),
                'support_items' => $this->mapIpcrItems($grouped->get('support', collect())),
            ];
        })->all();

        return [
            'pdf.admin.ipcr',
            [
                'officeName' => (string) $office->name,
                'periodLabel' => $this->formatPeriodRange($period),
                'employees' => $employees,
            ],
            $this->makeFilename('ipcr', $period, $office),
            ['legal', 'landscape'],
        ];
    }

    private function buildOrsDocument(PerformancePeriod $period, Office $office): array
    {
        $entries = OrsEntry::query()
            ->with([
                'employee:id,name',
                'ipcrItem:id,output_title,indicator_text',
                'monitoring.supervisor:id,name',
            ])
            ->where('office_id', $office->id)
            ->where('performance_period_id', $period->id)
            ->where(function ($query): void {
                $query->whereIn('status', ['submitted', 'rated'])
                    ->orWhereHas('monitoring', function ($monitoringQuery): void {
                        $monitoringQuery->whereNotNull('rated_at');
                    });
            })
            ->orderBy('employee_id')
            ->orderBy('work_date')
            ->orderBy('id')
            ->get();

        if ($entries->isEmpty()) {
            throw new AdminReportException('No ORS data found for the selected office and performance period.');
        }

        return [
            'pdf.admin.ors',
            [
                'officeName' => (string) $office->name,
                'periodLabel' => $this->formatPeriodRange($period),
                'entries' => $entries->map(function (OrsEntry $entry): array {
                    $outputTitle = trim((string) ($entry->ipcrItem?->output_title ?? ''));
                    $indicator = trim((string) ($entry->ipcrItem?->indicator_text ?? ''));

                    return [
                        'employee_name' => (string) ($entry->employee?->name ?? 'Unknown Employee'),
                        'output' => trim($outputTitle . ($indicator !== '' ? ' - ' . $indicator : '')),
                        'work_date' => $entry->work_date ? Carbon::parse($entry->work_date)->format('M d, Y') : '--',
                        'quantity' => $entry->quantity ?? 0,
                        'quality' => $entry->monitoring?->quality_rating ?? '--',
                        'timeliness' => $entry->monitoring?->timeliness_rating ?? '--',
                        'remarks' => (string) ($entry->monitoring?->remarks ?? ''),
                        'supervisor' => (string) ($entry->monitoring?->supervisor?->name ?? 'N/A'),
                    ];
                })->all(),
            ],
            $this->makeFilename('ors', $period, $office),
            ['legal', 'portrait'],
        ];
    }

    private function buildMporDocument(PerformancePeriod $period, Office $office): array
    {
        $months = $this->periodMonths($period);

        $mpors = Mpor::query()
            ->with([
                'employee:id,name',
                'ratedOrsEntriesForMonth.monitoring',
                'ratedOrsEntriesForMonth.ipcrItem:id,output_title',
            ])
            ->where('office_id', $office->id)
            ->whereIn('month', $months)
            ->orderBy('employee_id')
            ->orderBy('month')
            ->get();

        if ($mpors->isEmpty()) {
            throw new AdminReportException('No MPOR data found for the selected office and performance period.');
        }

        $employees = $mpors->groupBy('employee_id')->map(function (Collection $employeeMpors) use ($months): array {
            $employee = $employeeMpors->first()?->employee;
            $rows = [];

            foreach ($employeeMpors as $mpor) {
                foreach ($mpor->ratedOrsEntriesForMonth as $entry) {
                    $key = (string) ($entry->ipcrItem?->output_title ?: 'Unassigned Output');
                    if (!isset($rows[$key])) {
                        $rows[$key] = [
                            'output' => $key,
                            'months' => collect($months)->mapWithKeys(
                                static fn (string $month): array => [$month => ['qty' => 0.0, 'quality' => 0.0, 'timeliness' => 0.0]]
                            )->all(),
                        ];
                    }

                    $quantity = (float) ($entry->quantity ?? 0);
                    $qualityRating = (float) ($entry->monitoring?->quality_rating ?? 0);
                    $timelinessRating = (float) ($entry->monitoring?->timeliness_rating ?? 0);

                    $rows[$key]['months'][(string) $mpor->month]['qty'] += $quantity;
                    $rows[$key]['months'][(string) $mpor->month]['quality'] += $quantity * $qualityRating;
                    $rows[$key]['months'][(string) $mpor->month]['timeliness'] += $quantity * $timelinessRating;
                }
            }

            return [
                'employee_name' => (string) ($employee?->name ?? 'Unknown Employee'),
                'rows' => array_values($rows),
            ];
        })->values()->all();

        return [
            'pdf.admin.mpor',
            [
                'officeName' => (string) $office->name,
                'periodLabel' => $this->formatPeriodRange($period),
                'months' => $months,
                'employees' => $employees,
            ],
            $this->makeFilename('mpor', $period, $office),
            ['legal', 'landscape'],
        ];
    }

    private function buildQarDocument(PerformancePeriod $period, Office $office): array
    {
        $qarHeader = QarHeader::query()
            ->with([
                'office:id,name',
                'performancePeriod:id,name,start_date,end_date',
                'rows:id,qar_header_id,ppa_code,mfo_title,indicator_text,target_quantity,target_timeline,actual_performance,variance,remarks,sort_order',
            ])
            ->where('office_id', $office->id)
            ->where('performance_period_id', $period->id)
            ->orderByRaw(
                "CASE WHEN status = ? THEN 0 WHEN status = ? THEN 1 ELSE 2 END",
                [QarHeader::STATUS_PMT_APPROVED, QarHeader::STATUS_DEPT_HEAD_ENDORSED]
            )
            ->orderByDesc('approved_at')
            ->orderByDesc('generated_at')
            ->orderByDesc('id')
            ->first();

        if (!$qarHeader) {
            throw new AdminReportException('No QAR data found for the selected office and performance period.');
        }

        $quarterEndingLabel = now()->format('F d, Y');
        if (preg_match('/^(\d{4})-Q(\d)$/', (string) $qarHeader->quarter_key, $matches)) {
            $quarter = (int) $matches[2];
            $month = $quarter === 1 ? 3 : 6;
            $quarterEndingLabel = Carbon::create((int) $matches[1], $month, 1)->endOfMonth()->format('F d, Y');
        }

        return [
            'pdf.stage-two.qar',
            [
                'qarHeader' => $qarHeader,
                'officeName' => (string) $office->name,
                'periodName' => (string) ($period->name ?? 'Performance Period'),
                'periodRange' => $this->formatPeriodRange($period),
                'quarterEndingLabel' => $quarterEndingLabel,
            ],
            $this->makeFilename('qar', $period, $office),
            ['legal', 'landscape'],
        ];
    }

    private function buildSmporDocument(PerformancePeriod $period, Office $office): array
    {
        $smpor = Smpor::query()
            ->with([
                'items.employee:id,name',
            ])
            ->where('office_id', $office->id)
            ->where('performance_period_id', $period->id)
            ->orderByDesc('generated_at')
            ->orderByDesc('id')
            ->first();

        if (!$smpor) {
            throw new AdminReportException('No SMPOR data found for the selected office and performance period.');
        }

        return [
            'pdf.admin.smpor',
            [
                'officeName' => (string) $office->name,
                'periodLabel' => $this->formatPeriodRange($period),
                'summary' => [
                    'avg_quality' => $smpor->avg_quality !== null ? number_format((float) $smpor->avg_quality, 2) : 'N/A',
                    'avg_timeliness' => $smpor->avg_timeliness !== null ? number_format((float) $smpor->avg_timeliness, 2) : 'N/A',
                    'overall_score' => $smpor->overall_score !== null ? number_format((float) $smpor->overall_score, 2) : 'N/A',
                    'adjectival_rating' => (string) ($smpor->adjectival_rating ?? 'N/A'),
                ],
                'items' => $smpor->items->map(static function ($item): array {
                    return [
                        'employee_name' => (string) ($item->employee?->name ?? 'Unknown Employee'),
                        'quality_avg' => number_format((float) ($item->quality_avg ?? 0), 2),
                        'timeliness_avg' => number_format((float) ($item->timeliness_avg ?? 0), 2),
                        'overall_score' => number_format((float) ($item->overall_score ?? 0), 2),
                        'adjectival_rating' => (string) ($item->adjectival_rating ?? 'N/A'),
                    ];
                })->all(),
            ],
            $this->makeFilename('smpor', $period, $office),
            ['a4', 'landscape'],
        ];
    }

    private function mapIpcrItems(Collection $items): array
    {
        return $items->map(function ($item): array {
            $standards = Arr::wrap($item->standards_payload);

            return [
                'output' => (string) $item->output_title,
                'indicator' => (string) $item->indicator_text,
                'target_summary' => (string) ($item->target_summary ?: $item->target_timeline ?: $item->target_quantity ?: '--'),
                'standards' => $this->formatStandardsPayload($standards),
            ];
        })->values()->all();
    }

    private function formatStandardsPayload(array $payload): string
    {
        if ($payload === []) {
            return '--';
        }

        $segments = [];
        foreach ([5, 4, 3, 2, 1] as $rating) {
            $entry = Arr::get($payload, $rating, Arr::get($payload, (string) $rating, []));
            if (!is_array($entry) || $entry === []) {
                continue;
            }

            $parts = [];
            foreach (['q' => 'Q', 'e' => 'E', 't' => 'T'] as $key => $label) {
                $values = array_values(array_filter(Arr::wrap($entry[$key] ?? [])));
                if ($values !== []) {
                    $parts[] = $label . ': ' . implode('; ', $values);
                }
            }

            if ($parts !== []) {
                $segments[] = $rating . ' [' . implode(' | ', $parts) . ']';
            }
        }

        return $segments === [] ? '--' : implode(' | ', $segments);
    }

    private function periodMonths(PerformancePeriod $period): array
    {
        $start = Carbon::parse($period->start_date)->startOfMonth();
        $end = Carbon::parse($period->end_date)->startOfMonth();
        $months = [];

        for ($cursor = $start->copy(); $cursor->lte($end); $cursor->addMonth()) {
            $months[] = $cursor->format('Y-m');
        }

        return $months;
    }

    private function formatPeriodRange(PerformancePeriod $period): string
    {
        return Carbon::parse($period->start_date)->format('F d, Y')
            . ' - ' .
            Carbon::parse($period->end_date)->format('F d, Y');
    }

    private function makeFilename(string $slug, PerformancePeriod $period, Office $office): string
    {
        $officeSlug = Str::slug((string) $office->name, '_');
        $periodSlug = Str::slug((string) $period->name, '_');

        return strtoupper($slug) . '_' . $officeSlug . '_' . $periodSlug . '.pdf';
    }

    private function formatFunctionLabel(string $functionType, float $weight): string
    {
        $label = Str::title(strtolower($functionType));
        $weightLabel = rtrim(rtrim(number_format($weight, 2, '.', ''), '0'), '.');

        return $weight > 0 ? "{$label} ({$weightLabel}%)" : $label;
    }
}

class AdminReportException extends \RuntimeException
{
}
