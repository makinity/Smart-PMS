<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use App\Models\QarRow;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QarController extends Controller
{
    // ── Quarter helpers ───────────────────────────────────────────────────────

    private function quarterMonths(PerformancePeriod $period, int $q): array
    {
        $year = $period->start_date->year;
        // Q1 = Jan-Mar, Q2 = Apr-Jun (period is 2 quarters / 6 months)
        $base = ($q - 1) * 3 + 1;
        return [
            Carbon::create($year, $base,     1)->startOfMonth(),
            Carbon::create($year, $base + 1, 1)->startOfMonth(),
            Carbon::create($year, $base + 2, 1)->startOfMonth(),
        ];
    }

    private function quarterKey(PerformancePeriod $period, int $q): string
    {
        return $period->start_date->year . '-Q' . $q;
    }

    // ── Consolidate Annex I rows from endorsed MPORs in a quarter ─────────────

    private function consolidate(int $officeId, PerformancePeriod $period, int $q): array
    {
        $months = $this->quarterMonths($period, $q);

        $monthStrings = array_map(fn($m) => $m->format('Y-m'), $months);

        $mpors = Mpor::where('office_id', $officeId)
            ->where('status', 'approved')
            ->whereIn('month', $monthStrings)
            ->with(['employee'])
            ->get();

        if ($mpors->isEmpty()) return ['rows' => [], 'mpors' => []];

        // Collect all rated entries from all employees in those MPORs
        $rows = [];
        $sort = 0;

        foreach ($mpors as $mpor) {
            $start = Carbon::parse($mpor->month . '-01')->startOfMonth();
            $end   = $start->copy()->endOfMonth();

            $entries = OrsEntry::with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
                ->where('employee_id', $mpor->employee_id)
                ->where('status', 'rated')
                ->where('quantity', '>', 0)
                ->whereBetween('work_date', [$start, $end])
                ->get()
                ->filter(fn ($e) => ($m = $e->monitoring->first()) && $m->quality_rating !== null && $m->timeliness_rating !== null);

            foreach ($entries as $entry) {
                $item      = $entry->ipcrItem;
                $indicator = $item?->indicator;
                if (! $indicator) continue;

                $mfo     = $indicator->uwpMfo;
                $rowKey  = $item->id . '_' . strtolower(trim($indicator->indicator_text ?? ''));

                if (! isset($rows[$rowKey])) {
                    $rows[$rowKey] = [
                        'ppa_code'           => (string) $item->id,
                        'mfo_title'          => $mfo?->title ?? 'Unknown',
                        'indicator_text'     => $indicator->indicator_text ?? '',
                        'target_quantity'    => is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : null,
                        'target_timeline'    => $indicator->target_timeline ?? '',
                        'actual_performance' => 0,
                        'variance'           => null,
                        'remarks'            => 'Consolidated from multiple employee MPORs',
                        'sort_order'         => $sort++,
                    ];
                }
                $rows[$rowKey]['actual_performance'] += (int) $entry->quantity;
            }
        }

        // Compute variance
        foreach ($rows as &$row) {
            if ($row['target_quantity'] !== null) {
                $row['variance'] = $row['actual_performance'] - $row['target_quantity'];
            }
        }
        unset($row);

        return [
            'rows'  => array_values($rows),
            'mpors' => $mpors,
        ];
    }

    // ── Index ─────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $user   = Auth::user();
        $period = PerformancePeriod::current();
        $q      = (int) $request->get('q', $this->currentQuarter($period));

        if ($q < 1 || $q > 2) $q = 1;

        $consolidated = $period ? $this->consolidate($user->office_id, $period, $q) : ['rows' => [], 'mpors' => collect()];

        $quarterKey = $period ? $this->quarterKey($period, $q) : null;
        $qarHeader  = $quarterKey
            ? QarHeader::where('office_id', $user->office_id)
                ->where('quarter_key', $quarterKey)
                ->first()
            : null;

        // Format MPORs for the table
        $mporList = collect($consolidated['mpors'])->map(fn ($m) => [
            'id'          => $m->id,
            'month'       => $m->month,
            'month_label' => Carbon::parse($m->month . '-02')->format('M Y'),
            'status'      => $m->status,
            'approved_at' => $m->approved_at?->format('M j, Y'),
            'employee'    => [
                'name'     => $m->employee?->name,
                'position' => $m->employee?->position,
                'avatar'   => $m->employee?->profile_photo_url,
            ],
        ])->values();

        // Months covered
        $quarterMonths = $period
            ? array_map(fn($m) => $m->format('Y-m'), $this->quarterMonths($period, $q))
            : [];
        $coveredMonths = $mporList->pluck('month')->unique()->values();

        return Inertia::render('DeptHead/Qar/Index', [
            'period'         => $period ? ['id' => $period->id, 'name' => $period->name] : null,
            'q'              => $q,
            'quarterKey'     => $quarterKey,
            'quarterMonths'  => $quarterMonths,
            'coveredMonths'  => $coveredMonths,
            'annexRows'      => $consolidated['rows'],
            'mpors'          => $mporList,
            'qarHeader'      => $qarHeader ? [
                'id'          => $qarHeader->id,
                'status'      => $qarHeader->status,
                'pmt_status'  => $qarHeader->pmt_status,
                'approved_at' => $qarHeader->approved_at?->format('M j, Y · h:i A'),
                'approved_by' => $qarHeader->approvedBy?->name,
            ] : null,
            'deptHead'       => ['name' => $user->name, 'position' => $user->position],
        ]);
    }

    // ── Endorse ───────────────────────────────────────────────────────────────

    public function submit(Request $request)
    {
        $user   = Auth::user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $q   = (int) $request->input('q', 1);
        abort_unless($q >= 1 && $q <= 2, 422, 'Invalid quarter.');

        $consolidated = $this->consolidate($user->office_id, $period, $q);
        abort_if(empty($consolidated['rows']), 422, 'No approved MPORs found for this quarter.');

        $quarterKey = $this->quarterKey($period, $q);

        DB::transaction(function () use ($user, $period, $quarterKey, $consolidated, $q) {
            $header = QarHeader::updateOrCreate(
                ['office_id' => $user->office_id, 'performance_period_id' => $period->id, 'quarter_key' => $quarterKey],
                [
                    'status'       => 'submitted',
                    'generated_at' => now(),
                    'generated_by' => $user->id,
                    'approved_at'  => now(),
                    'approved_by'  => $user->id,
                    'pmt_status'   => 'pending',
                ]
            );

            $header->rows()->delete();
            foreach ($consolidated['rows'] as $row) {
                $header->rows()->create($row);
            }

            $header->mporLinks()->delete();
            foreach ($consolidated['mpors'] as $mpor) {
                $header->mporLinks()->create([
                    'mpor_id'       => $mpor->id,
                    'employee_name' => $mpor->employee?->name,
                    'month_label'   => Carbon::parse($mpor->month . '-02')->format('M Y'),
                    'status_label'  => $mpor->status,
                ]);
            }
        });

        // Notify PMT
        $pmtUsers = User::where('role', 'pmt')->get();
        foreach ($pmtUsers as $pmt) {
            $pmt->notifications()->create([
                'id'   => \Illuminate\Support\Str::uuid(),
                'type' => 'App\Notifications\WorkflowEventNotification',
                'data' => json_encode([
                    'event'   => 'qar.submitted_to_pmt',
                    'type'    => 'info',
                    'message' => 'QAR for ' . $quarterKey . ' has been submitted by ' . $user->name,
                    'link'    => '/pmt/qar',
                ]),
            ]);
        }

        return back()->with('success', 'QAR submitted to PMT successfully.');
    }

    // ── MPOR detail (read-only) ───────────────────────────────────────────────

    public function mporShow(Request $request, Mpor $mpor)
    {
        $user = Auth::user();
        abort_unless($mpor->office_id === $user->office_id, 403);

        $mpor->load(['employee', 'approvedBy', 'endorsedBy']);

        $month = $mpor->month;
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end   = $start->copy()->endOfMonth();
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

        $weekOf = fn($date) => match (true) {
            Carbon::parse($date)->day <= 7  => 1,
            Carbon::parse($date)->day <= 14 => 2,
            Carbon::parse($date)->day <= 21 => 3,
            default                          => 4,
        };

        $sections = [];
        if ($ipcr) {
            foreach ($ipcr->items as $item) {
                $fn  = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) continue;
                $key    = $fn->function_type;
                $rowKey = strtolower(trim($mfo->title));
                if (! isset($sections[$key])) {
                    $sections[$key] = ['key' => $key, 'label' => $fn->name, 'weight' => $fn->weight_percent, 'rows' => []];
                }
                if (! isset($sections[$key]['rows'][$rowKey])) {
                    $sections[$key]['rows'][$rowKey] = ['title' => $mfo->title, 'qty' => [1=>0,2=>0,3=>0,4=>0], 'quality' => [1=>0,2=>0,3=>0,4=>0], 'timeliness' => [1=>0,2=>0,3=>0,4=>0]];
                }
            }
        }
        foreach ($entries as $entry) {
            $indicator = $entry->ipcrItem?->indicator;
            if (! $indicator) continue;
            $mfo      = $indicator->uwpMfo;
            $fn       = $mfo?->uwpFunction;
            $fnType   = $fn?->function_type ?? 'core';
            $fnName   = $fn?->name ?? ($fnType === 'core' ? 'Core Functions' : 'Support Functions');
            $fnWeight = $fn?->weight_percent ?? ($fnType === 'core' ? 80 : 20);
            $rowKey   = strtolower(trim($mfo?->title ?? 'Unknown'));
            $week     = $weekOf($entry->work_date);
            $mon      = $entry->monitoring->first();
            $qty      = (int) $entry->quantity;

            if (! isset($sections[$fnType])) {
                $sections[$fnType] = ['key' => $fnType, 'label' => $fnName, 'weight' => $fnWeight, 'rows' => []];
            }
            if (! isset($sections[$fnType]['rows'][$rowKey])) {
                $sections[$fnType]['rows'][$rowKey] = ['title' => $mfo?->title ?? 'Unknown', 'qty' => [1=>0,2=>0,3=>0,4=>0], 'quality' => [1=>0,2=>0,3=>0,4=>0], 'timeliness' => [1=>0,2=>0,3=>0,4=>0]];
            }
            $sections[$fnType]['rows'][$rowKey]['qty'][$week]        += $qty;
            $sections[$fnType]['rows'][$rowKey]['quality'][$week]    += $qty * ($mon->quality_rating ?? 0);
            $sections[$fnType]['rows'][$rowKey]['timeliness'][$week] += $qty * ($mon->timeliness_rating ?? 0);
        }

        ksort($sections);
        $result = [];
        $grandQtyCount = 0; $grandQualSum = 0; $grandTimeSum = 0;
        $grandQty = [1=>0,2=>0,3=>0,4=>0];

        foreach ($sections as $section) {
            $rows = [];
            foreach ($section['rows'] as $row) {
                $qtyTotal = array_sum($row['qty']);
                for ($w = 1; $w <= 4; $w++) $grandQty[$w] += $row['qty'][$w];
                $grandQtyCount += $qtyTotal;
                $grandQualSum  += array_sum($row['quality']);
                $grandTimeSum  += array_sum($row['timeliness']);
                $rows[] = [
                    'title'      => $row['title'],
                    'qty'        => $row['qty'],
                    'qty_total'  => $qtyTotal,
                    'quality'    => array_map(fn($v, $q) => $q > 0 ? round($v / $q, 1) : 0, $row['quality'], $row['qty']),
                    'qual_avg'   => $qtyTotal > 0 ? round(array_sum($row['quality']) / $qtyTotal, 2) : 0,
                    'timeliness' => array_map(fn($v, $q) => $q > 0 ? round($v / $q, 1) : 0, $row['timeliness'], $row['qty']),
                    'time_avg'   => $qtyTotal > 0 ? round(array_sum($row['timeliness']) / $qtyTotal, 2) : 0,
                ];
            }
            $result[] = ['key' => $section['key'], 'label' => $section['label'], 'weight' => $section['weight'], 'rows' => $rows];
        }

        // Check if this MPOR is included in a submitted QAR
        $inQar = QarMporLink::where('mpor_id', $mpor->id)
            ->whereHas('header', fn ($q) => $q->where('status', 'submitted'))
            ->exists();

        return Inertia::render('DeptHead/Qar/MporShow', [
            'mpor'         => [
                'id'          => $mpor->id,
                'month'       => $mpor->month,
                'status'      => $mpor->status,
                'submitted_at'=> $mpor->submitted_at?->format('M j, Y · h:i A'),
                'approved_at' => $mpor->approved_at?->format('M j, Y · h:i A'),
                'approved_by' => $mpor->approvedBy?->name,
                'in_qar'      => $inQar,
            ],
            'employee'     => [
                'name'     => $mpor->employee?->name,
                'position' => $mpor->employee?->position,
                'avatar'   => $mpor->employee?->profile_photo_url,
            ],
            'sections'     => $result,
            'grandQty'     => $grandQty,
            'grandQualAvg' => $grandQtyCount > 0 ? round($grandQualSum / $grandQtyCount, 2) : 0,
            'grandTimeAvg' => $grandQtyCount > 0 ? round($grandTimeSum / $grandQtyCount, 2) : 0,
            'grandQtyTotal'=> $grandQtyCount,
            'backQ'        => $request->get('q', 1),
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function currentQuarter(?PerformancePeriod $period): int
    {
        if (! $period) return 1;
        $month = now()->month;
        return min(2, (int) ceil($month / 3));
    }
}
