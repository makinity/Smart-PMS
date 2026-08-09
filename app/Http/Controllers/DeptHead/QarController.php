<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use App\Services\QarConsolidationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QarController extends Controller
{
    public function __construct(private QarConsolidationService $qar) {}

    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user = Auth::user();

        // All periods for the selector, newest first
        $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();

        // Resolve the period: prefer the period_id param, otherwise fall back to current
        $periodId = $request->get('period_id');
        $period = $periodId
            ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current()
            : PerformancePeriod::current();

        $q = (int) $request->get('q', $this->currentQuarter($period));

        if ($q < 1 || $q > 2) {
            $q = 1;
        }

        $consolidated = $period ? $this->qar->consolidate($user->office_id, $period, $q) : ['rows' => [], 'mpors' => collect()];

        $quarterKey = $period ? $this->qar->quarterKey($period, $q) : null;
        $qarHeader = $quarterKey
            ? QarHeader::where('office_id', $user->office_id)
                ->where('performance_period_id', $period->id)
                ->where('quarter_key', $quarterKey)
                ->first()
            : null;

        // Format MPORs for the table
        $mporList = collect($consolidated['mpors'])->map(fn ($m) => [
            'id' => $m->id,
            'month' => $m->month,
            'month_label' => Carbon::parse($m->month.'-02')->format('M Y'),
            'status' => $m->status,
            'approved_at' => $m->approved_at?->format('M j, Y'),
            'employee' => [
                'name' => $m->employee?->name,
                'position' => $m->employee?->position,
                'avatar' => $m->employee?->profile_photo_url,
            ],
        ])->values();

        // Months covered — only count a month if ALL office employees have an approved MPOR
        $quarterMonths = $period
            ? array_map(fn ($m) => $m->format('Y-m'), $this->qar->quarterMonths($period, $q))
            : [];
        $allEmployeeIds = User::whereHas('employee', fn ($eq) => $eq->where('office_id', $user->office_id))
            ->where('role', 'employee')
            ->pluck('id');
        $mporsByMonth = $consolidated['mpors']->groupBy('month');
        $coveredMonths = collect($quarterMonths)->filter(function ($month) use ($mporsByMonth, $allEmployeeIds) {
            $monthEmpIds = $mporsByMonth->get($month, collect())->pluck('employee_id')->unique();
            return $monthEmpIds->count() === $allEmployeeIds->count();
        })->values();

        // Build human-readable quarter tab labels — always Q1/Q2 (period-relative)
        // e.g. Jan-Jun → ['Q1 Jan–Mar', 'Q2 Apr–Jun'], Jul-Dec → ['Q1 Jul–Sep', 'Q2 Oct–Dec']
        $quarterTabLabels = [];
        if ($period) {
            foreach ([1, 2] as $qn) {
                $months = $this->qar->quarterMonths($period, $qn);
                $quarterTabLabels[$qn] = 'Q' . $qn . ' ' . $months[0]->format('M') . '–' . $months[2]->format('M');
            }
        }

        return Inertia::render('DeptHead/Qar/Index', [
            'period' => $period ? ['id' => $period->id, 'name' => $period->name, 'is_active' => $period->is_active] : null,
            'allPeriods' => $allPeriods->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_active' => $p->is_active])->values(),
            'q' => $q,
            'quarterKey' => $quarterKey,
            'quarterMonths' => $quarterMonths,
            'quarterTabLabels' => $quarterTabLabels,
            'coveredMonths' => $coveredMonths,
            'annexRows' => $consolidated['rows'],
            'mpors' => $mporList,
            'qarHeader' => $qarHeader ? [
                'id' => $qarHeader->id,
                'status' => $qarHeader->status,
                'pmt_status' => $qarHeader->pmt_status,
                'approved_at' => $qarHeader->approved_at?->format('M j, Y · h:i A'),
                'approved_by' => $qarHeader->approvedBy?->name,
            ] : null,
            'deptHead' => ['name' => $user->name, 'position' => $user->position],
        ]);
    }

    // ── Endorse ───────────────────────────────────────────────────────────────

    public function submit(Request $request)
    {
        $user = Auth::user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $q = (int) $request->input('q', 1);
        abort_unless($q >= 1 && $q <= 2, 422, 'Invalid quarter.');

        // Rule: every office employee must have an approved MPOR for each month in the quarter
        $quarterMonthStrings = array_map(fn ($m) => $m->format('Y-m'), $this->qar->quarterMonths($period, $q));
        $employeeIds = User::whereHas('employee', fn($q) => $q->where('office_id', $user->employee?->office_id))
            ->where('role', 'employee')
            ->pluck('id');

        $missingItems = [];
        foreach ($employeeIds as $empId) {
            foreach ($quarterMonthStrings as $month) {
                $exists = Mpor::where('employee_id', $empId)
                    ->where('month', $month)
                    ->where('status', 'approved')
                    ->exists();
                if (! $exists) {
                    $emp = \App\Models\User::find($empId);
                    $mpor = Mpor::where('employee_id', $empId)->where('month', $month)->first();
                    $isSubmitted = $mpor && $mpor->status === 'submitted';
                    $supervisor = $isSubmitted
                        ? \App\Models\User::whereHas('employee', fn($q) => $q->where('office_id', $emp?->employee?->office_id))->where('role', 'supervisor')->first()
                        : null;
                    $missingItems[] = [
                        'employee_id'   => $supervisor ? $supervisor->id : $empId,
                        'mpor_id'       => $mpor?->id,
                        'name'          => $emp?->name ?? 'Unknown',
                        'position'      => $emp?->position ?? '',
                        'avatar'        => $emp?->profile_photo_url ?? null,
                        'month'         => $month,
                        'reason'        => \Carbon\Carbon::parse($month . '-01')->format('F Y') . ($isSubmitted ? ' — MPOR submitted, awaiting supervisor approval' : ' — MPOR not approved'),
                    ];
                }
            }
        }
        if (! empty($missingItems)) {
            return back()->withErrors([
                'message'       => 'Cannot submit QAR: missing approved MPORs for some employees.',
                'missing_mpors' => json_encode($missingItems),
            ]);
        }


        $consolidated = $this->qar->consolidate($user->office_id, $period, $q);
        abort_if(empty($consolidated['rows']), 422, 'No approved MPORs found for this quarter.');

        $quarterKey = $this->qar->quarterKey($period, $q);

        $header = DB::transaction(function () use ($user, $period, $quarterKey, $consolidated) {
            $header = QarHeader::updateOrCreate(
                ['office_id' => $user->office_id, 'performance_period_id' => $period->id, 'quarter_key' => $quarterKey],
                [
                    'status' => 'submitted',
                    'generated_at' => now(),
                    'generated_by' => $user->id,
                    'approved_at' => now(),
                    'approved_by' => $user->id,
                    'pmt_status' => 'pending',
                ]
            );

            $header->rows()->delete();
            foreach ($consolidated['rows'] as $row) {
                $header->rows()->create($row);
            }

            $header->mporLinks()->delete();
            foreach ($consolidated['mpors'] as $mpor) {
                $header->mporLinks()->create([
                    'mpor_id' => $mpor->id,
                    'employee_name' => $mpor->employee?->name,
                    'month_label' => Carbon::parse($mpor->month.'-02')->format('M Y'),
                    'status_label' => $mpor->status,
                ]);
            }

            return $header;
        });

        // Notify PMT
        User::where('role', 'pmt')->each(fn ($pmt) => $pmt->notify(new WorkflowEventNotification(
            type: 'info',
            event: 'qar.submitted_to_pmt',
            message: 'QAR for '.$quarterKey.' has been submitted by '.$user->name,
            url: route('pmt.qar.show', $header),
        ))
        );

        return back()->with('success', 'QAR submitted to PMT successfully.');
    }

    // ── MPOR detail (read-only) ───────────────────────────────────────────────

    public function mporShow(Request $request, Mpor $mpor)
    {
        $user = Auth::user();
        abort_unless($mpor->office_id === $user->office_id, 403);

        $mpor->load(['employee', 'approvedBy', 'endorsedBy']);

        $month = $mpor->month;
        $start = Carbon::parse($month.'-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $empId = $mpor->employee_id;

        $ipcr = Ipcr::where('employee_id', $empId)
            ->whereIn('status', ['committed', 'for_commitment'])
            ->with('items.indicator.uwpMfo.uwpFunction')
            ->latest()->first();

        $entries = OrsEntry::with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
            ->where('employee_id', $empId)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$start, $end])
            ->get()
            ->filter(fn ($e) => ($m = $e->monitoring->first()) && $m->quality_rating !== null && $m->timeliness_rating !== null);

        $weekOf = fn ($date) => match (true) {
            Carbon::parse($date)->day <= 7 => 1,
            Carbon::parse($date)->day <= 14 => 2,
            Carbon::parse($date)->day <= 21 => 3,
            default => 4,
        };

        $sections = [];
        if ($ipcr) {
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) {
                    continue;
                }
                $key = $fn->function_type;
                $rowKey = strtolower(trim($mfo->title));
                if (! isset($sections[$key])) {
                    $sections[$key] = ['key' => $key, 'label' => $fn->name, 'weight' => $fn->weight_percent, 'rows' => []];
                }
                if (! isset($sections[$key]['rows'][$rowKey])) {
                    $sections[$key]['rows'][$rowKey] = ['title' => $mfo->title, 'qty' => [1 => 0, 2 => 0, 3 => 0, 4 => 0], 'quality' => [1 => 0, 2 => 0, 3 => 0, 4 => 0], 'timeliness' => [1 => 0, 2 => 0, 3 => 0, 4 => 0]];
                }
            }
        }
        foreach ($entries as $entry) {
            $indicator = $entry->ipcrItem?->indicator;
            if (! $indicator) {
                continue;
            }
            $mfo = $indicator->uwpMfo;
            $fn = $mfo?->uwpFunction;
            $fnType = $fn?->function_type ?? 'core';
            $fnName = $fn?->name ?? ($fnType === 'core' ? 'Core Functions' : 'Support Functions');
            $fnWeight = $fn?->weight_percent ?? ($fnType === 'core' ? 80 : 20);
            $rowKey = strtolower(trim($mfo?->title ?? 'Unknown'));
            $week = $weekOf($entry->work_date);
            $mon = $entry->monitoring->first();
            $qty = (int) $entry->quantity;

            if (! isset($sections[$fnType])) {
                $sections[$fnType] = ['key' => $fnType, 'label' => $fnName, 'weight' => $fnWeight, 'rows' => []];
            }
            if (! isset($sections[$fnType]['rows'][$rowKey])) {
                $sections[$fnType]['rows'][$rowKey] = ['title' => $mfo?->title ?? 'Unknown', 'qty' => [1 => 0, 2 => 0, 3 => 0, 4 => 0], 'quality' => [1 => 0, 2 => 0, 3 => 0, 4 => 0], 'timeliness' => [1 => 0, 2 => 0, 3 => 0, 4 => 0]];
            }
            $sections[$fnType]['rows'][$rowKey]['qty'][$week] += $qty;
            $sections[$fnType]['rows'][$rowKey]['quality'][$week] += $qty * ($mon->quality_rating ?? 0);
            $sections[$fnType]['rows'][$rowKey]['timeliness'][$week] += $qty * ($mon->timeliness_rating ?? 0);
        }

        ksort($sections);
        $result = [];
        $grandQtyCount = 0;
        $grandQualSum = 0;
        $grandTimeSum = 0;
        $grandQty = [1 => 0, 2 => 0, 3 => 0, 4 => 0];

        foreach ($sections as $section) {
            $rows = [];
            foreach ($section['rows'] as $row) {
                $qtyTotal = array_sum($row['qty']);
                for ($w = 1; $w <= 4; $w++) {
                    $grandQty[$w] += $row['qty'][$w];
                }
                $grandQtyCount += $qtyTotal;
                $grandQualSum += array_sum($row['quality']);
                $grandTimeSum += array_sum($row['timeliness']);
                $rows[] = [
                    'title' => $row['title'],
                    'qty' => $row['qty'],
                    'qty_total' => $qtyTotal,
                    'quality' => array_map(fn ($v) => round($v, 1), $row['quality']),
                    'qual_avg' => $qtyTotal > 0 ? round(array_sum($row['quality']) / $qtyTotal, 2) : 0,
                    'timeliness' => array_map(fn ($v) => round($v, 1), $row['timeliness']),
                    'time_avg' => $qtyTotal > 0 ? round(array_sum($row['timeliness']) / $qtyTotal, 2) : 0,
                ];
            }
            $result[] = ['key' => $section['key'], 'label' => $section['label'], 'weight' => $section['weight'], 'rows' => $rows];
        }

        // Check if this MPOR is included in a submitted QAR
        $inQar = QarMporLink::where('mpor_id', $mpor->id)
            ->whereHas('header', fn ($q) => $q->where('status', 'submitted'))
            ->exists();

        return Inertia::render('DeptHead/Qar/MporShow', [
            'mpor' => [
                'id' => $mpor->id,
                'month' => $mpor->month,
                'status' => $mpor->status,
                'submitted_at' => $mpor->submitted_at?->format('M j, Y · h:i A'),
                'approved_at' => $mpor->approved_at?->format('M j, Y · h:i A'),
                'approved_by' => $mpor->approvedBy?->name,
                'in_qar' => $inQar,
            ],
            'employee' => [
                'name' => $mpor->employee?->name,
                'position' => $mpor->employee?->position,
                'avatar' => $mpor->employee?->profile_photo_url,
            ],
            'sections' => $result,
            'grandQty' => $grandQty,
            'grandQualAvg' => $grandQtyCount > 0 ? round($grandQualSum / $grandQtyCount, 2) : 0,
            'grandTimeAvg' => $grandQtyCount > 0 ? round($grandTimeSum / $grandQtyCount, 2) : 0,
            'grandQtyTotal' => $grandQtyCount,
            'backQ' => $request->get('q', 1),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function currentQuarter(?PerformancePeriod $period): int
    {
        if (! $period) {
            return 1;
        }
        // How many months into this period are we?
        $monthsElapsed = (int) $period->start_date->diffInMonths(now());
        // Q1 = months 0-2, Q2 = months 3-5
        return $monthsElapsed >= 3 ? 2 : 1;
    }
}
