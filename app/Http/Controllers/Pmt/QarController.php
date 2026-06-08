<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\Office;
use App\Models\OrsEntry;
use App\Models\QarHeader;
use App\Models\User;
use App\Services\PerformanceRatingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class QarController extends Controller
{
    public function index(Request $request)
    {
        $search   = $request->get('search', '');
        $officeId = $request->get('office_id', '');
        $status   = $request->get('status', '');

        $query = QarHeader::with(['office', 'approvedBy'])
            ->whereIn('status', ['submitted', 'pmt_approved', 'returned'])
            ->orderBy('approved_at', 'desc');

        if ($search) {
            $query->whereHas('office', fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"));
        }
        if ($officeId) {
            $query->where('office_id', $officeId);
        }
        if ($status && in_array($status, ['submitted', 'pmt_approved', 'returned'])) {
            $query->where('status', $status);
        }

        $qars = $query->get()->map(fn ($q) => [
            'id'           => $q->id,
            'quarter_key'  => $q->quarter_key,
            'status'       => $q->status,
            'pmt_status'   => $q->pmt_status,
            'submitted_at' => $q->approved_at?->format('M j, Y'),
            'office'       => ['id' => $q->office?->id, 'name' => $q->office?->name, 'code' => $q->office?->code],
            'dept_head'    => $this->deptHeadOf($q->office_id),
        ]);

        $offices = Office::orderBy('name')->get()->map(fn ($o) => ['id' => $o->id, 'name' => $o->name]);

        return Inertia::render('Pmt/Qar/Index', [
            'qars'    => $qars,
            'offices' => $offices,
            'search'  => $search,
            'officeId'=> $officeId,
            'status'  => $status,
        ]);
    }

    public function show(QarHeader $qar)
    {
        $qar->load(['office', 'rows' => fn ($q) => $q->orderBy('sort_order'), 'mporLinks.mpor.employee', 'approvedBy']);

        $mpors = $qar->mporLinks->map(fn ($link) => [
            'id'          => $link->mpor?->id,
            'month'       => $link->mpor?->month,
            'month_label' => $link->month_label,
            'status'      => $link->mpor?->status,
            'approved_at' => $link->mpor?->approved_at?->format('M j, Y'),
            'employee'    => [
                'name'     => $link->mpor?->employee?->name,
                'position' => $link->mpor?->employee?->position,
                'avatar'   => $link->mpor?->employee?->profile_photo_url,
            ],
        ]);

        return Inertia::render('Pmt/Qar/Show', [
            'qar'     => [
                'id'           => $qar->id,
                'quarter_key'  => $qar->quarter_key,
                'status'       => $qar->status,
                'pmt_status'   => $qar->pmt_status,
                'submitted_at' => $qar->approved_at?->format('M j, Y · h:i A'),
                'validated_at' => $qar->pmt_validated_at?->format('M j, Y · h:i A'),
                'validated_by' => $qar->pmtValidatedBy?->name,
                'return_remarks'=> $qar->return_remarks ?? null,
            ],
            'office'  => ['name' => $qar->office?->name, 'code' => $qar->office?->code],
            'deptHead'=> $this->deptHeadOf($qar->office_id),
            'annexRows'=> $qar->rows->map(fn ($r) => [
                'ppa_code'           => $r->ppa_code,
                'mfo_title'          => $r->mfo_title,
                'indicator_text'     => $r->indicator_text,
                'target_quantity'    => $r->target_quantity,
                'target_timeline'    => $r->target_timeline,
                'actual_performance' => $r->actual_performance,
                'variance'           => $r->variance,
                'remarks'            => $r->remarks,
            ])->values(),
            'mpors'   => $mpors->values(),
        ]);
    }

    public function approve(Request $request, QarHeader $qar)
    {
        abort_unless($qar->status === 'submitted', 422, 'QAR is not in submitted status.');

        $qar->update([
            'status'           => 'pmt_approved',
            'pmt_status'       => 'validated',
            'pmt_validated_at' => now(),
            'pmt_validated_by' => Auth::id(),
        ]);

        // Calculate and save performance scores for all employees linked to this QAR
        $ratingService = app(PerformanceRatingService::class);
        $qar->load('mporLinks.mpor');
        $employeeIds = $qar->mporLinks
            ->map(fn($link) => $link->mpor?->employee_id)
            ->filter()
            ->unique();

        foreach ($employeeIds as $employeeId) {
            $ipcr = Ipcr::where('employee_id', $employeeId)
                ->where('performance_period_id', $qar->performance_period_id)
                ->first();
            if ($ipcr) {
                $ratingService->calculateAndSaveFinalScore($ipcr);
            }
        }

        // Notify dept head
        $deptHead = User::where('office_id', $qar->office_id)->where('role', 'dept-head')->first();
        $deptHead?->notifications()->create([
            'id'   => \Illuminate\Support\Str::uuid(),
            'type' => 'App\Notifications\WorkflowEventNotification',
            'data' => json_encode(['event' => 'qar.pmt_approved', 'type' => 'info', 'message' => 'Your QAR for ' . $qar->quarter_key . ' has been approved by PMT.', 'link' => '/dept-head/qar']),
        ]);

        return back()->with('success', 'QAR approved.');
    }

    public function return(Request $request, QarHeader $qar)
    {
        abort_unless(in_array($qar->status, ['submitted', 'pmt_approved']), 422, 'Cannot return this QAR.');
        $request->validate(['return_remarks' => ['nullable', 'string', 'max:2000']]);

        $qar->update([
            'status'           => 'returned',
            'pmt_status'       => 'returned',
            'pmt_validated_at' => now(),
            'pmt_validated_by' => Auth::id(),
            'return_remarks'   => $request->return_remarks,
        ]);

        $deptHead = User::where('office_id', $qar->office_id)->where('role', 'dept-head')->first();
        $deptHead?->notifications()->create([
            'id'   => \Illuminate\Support\Str::uuid(),
            'type' => 'App\Notifications\WorkflowEventNotification',
            'data' => json_encode(['event' => 'qar.pmt_returned', 'type' => 'alert', 'message' => 'Your QAR for ' . $qar->quarter_key . ' was returned by PMT.', 'link' => '/dept-head/qar']),
        ]);

        return back()->with('success', 'QAR returned to Department Head.');
    }

    public function mporShow(Request $request, QarHeader $qar, Mpor $mpor)
    {
        $mpor->load(['employee', 'approvedBy']);

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
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                if (! $fn) continue;
                $key = $fn->function_type;
                if (! isset($sections[$key])) {
                    $sections[$key] = ['key' => $key, 'label' => $fn->name, 'weight' => $fn->weight_percent, 'rows' => []];
                }
            }
        }

        foreach ($entries as $entry) {
            $indicator = $entry->ipcrItem?->indicator;
            if (! $indicator) continue;
            $mfo     = $indicator->uwpMfo;
            $fn      = $mfo?->uwpFunction;
            $fnType  = $fn?->function_type ?? 'core';
            $rowKey  = strtolower(trim($mfo?->title ?? 'Unknown'));
            $week    = $weekOf($entry->work_date);
            $mon     = $entry->monitoring->first();
            $qty     = (int) $entry->quantity;

            if (! isset($sections[$fnType])) {
                $sections[$fnType] = ['key' => $fnType, 'label' => $fn?->name ?? 'Core Functions', 'weight' => $fn?->weight_percent ?? 80, 'rows' => []];
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
        $grandQty = [1=>0,2=>0,3=>0,4=>0]; $grandQtyCount = 0; $grandQualSum = 0; $grandTimeSum = 0;

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

        return Inertia::render('Pmt/Qar/MporShow', [
            'mpor'     => ['id' => $mpor->id, 'month' => $mpor->month, 'status' => $mpor->status, 'submitted_at' => $mpor->submitted_at?->format('M j, Y · h:i A'), 'approved_at' => $mpor->approved_at?->format('M j, Y · h:i A'), 'approved_by' => $mpor->approvedBy?->name],
            'employee' => ['name' => $mpor->employee?->name, 'position' => $mpor->employee?->position, 'avatar' => $mpor->employee?->profile_photo_url],
            'sections' => $result,
            'grandQty' => $grandQty,
            'grandQualAvg'  => $grandQtyCount > 0 ? round($grandQualSum / $grandQtyCount, 2) : 0,
            'grandTimeAvg'  => $grandQtyCount > 0 ? round($grandTimeSum / $grandQtyCount, 2) : 0,
            'grandQtyTotal' => $grandQtyCount,
            'backQarId'     => $request->get('qar_id'),
        ]);
    }

    private function deptHeadOf(int $officeId): ?array
    {
        $dh = User::where('office_id', $officeId)->where('role', 'dept-head')->first();
        return $dh ? ['name' => $dh->name, 'position' => $dh->position, 'avatar' => $dh->profile_photo_url] : null;
    }
}
