<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MporController extends Controller
{
    public function index(Request $request)
    {
        $user   = Auth::user();
        $search = $request->get('search', '');
        $month  = $request->get('month', '');
        $status = $request->get('status', '');

        $query = Mpor::with(['employee'])
            ->where('office_id', $user->office_id)
            ->whereIn('status', ['submitted', 'approved', 'endorsed', 'returned'])
            ->orderBy('submitted_at', 'desc');

        if ($search) {
            $query->whereHas('employee', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }
        if ($month && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $query->where('month', $month);
        }
        if ($status && in_array($status, ['submitted', 'approved', 'endorsed', 'returned'])) {
            $query->where('status', $status);
        }

        $mpors = $query->get()->map(fn ($m) => [
            'id'           => $m->id,
            'month'        => $m->month,
            'status'       => $m->status,
            'submitted_at' => $m->submitted_at?->format('M j, Y'),
            'employee'     => [
                'id'        => $m->employee?->id,
                'name'      => $m->employee?->name,
                'position'  => $m->employee?->position,
                'avatar'    => $m->employee?->profile_photo_url,
            ],
        ]);

        return Inertia::render('Supervisor/Mpor/Index', [
            'mpors'  => $mpors,
            'search' => $search,
            'month'  => $month,
            'status' => $status,
        ]);
    }

    public function show(Mpor $mpor)
    {
        $user = Auth::user();
        abort_unless($mpor->office_id === $user->office_id, 403);

        $mpor->load(['employee', 'approvedBy', 'endorsedBy', 'returnedBy']);

        $month  = $mpor->month;
        $start  = Carbon::parse($month . '-01')->startOfMonth();
        $end    = $start->copy()->endOfMonth();
        $empId  = $mpor->employee_id;

        // Load IPCR for function pre-seeding
        $ipcr = Ipcr::where('employee_id', $empId)
            ->whereIn('status', ['committed', 'for_commitment'])
            ->with('items.indicator.uwpMfo.uwpFunction')
            ->latest()
            ->first();

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

        // Pre-seed sections from IPCR
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
            $fn       = $indicator->uwpMfo?->uwpFunction;
            $fnType   = $fn?->function_type ?? 'core';
            $fnName   = $fn?->name ?? ($fnType === 'core' ? 'Core Functions' : 'Support Functions');
            $fnWeight = $fn?->weight_percent ?? ($fnType === 'core' ? 80 : 20);
            $rowKey   = strtolower(trim($indicator->indicator_text ?? 'Unknown'));
            $week     = $weekOf($entry->work_date);
            $mon      = $entry->monitoring->first();
            $qty      = (int) $entry->quantity;

            if (! isset($sections[$fnType])) {
                $sections[$fnType] = ['key' => $fnType, 'label' => $fnName, 'weight' => $fnWeight, 'rows' => []];
            }
            if (! isset($sections[$fnType]['rows'][$rowKey])) {
                $sections[$fnType]['rows'][$rowKey] = ['title' => $indicator->indicator_text, 'qty' => [1=>0,2=>0,3=>0,4=>0], 'quality' => [1=>0,2=>0,3=>0,4=>0], 'timeliness' => [1=>0,2=>0,3=>0,4=>0]];
            }
            $sections[$fnType]['rows'][$rowKey]['qty'][$week]        += $qty;
            $sections[$fnType]['rows'][$rowKey]['quality'][$week]    += $qty * ($mon->quality_rating ?? 0);
            $sections[$fnType]['rows'][$rowKey]['timeliness'][$week] += $qty * ($mon->timeliness_rating ?? 0);
        }

        ksort($sections);

        $result = [];
        $grandQty = [1=>0,2=>0,3=>0,4=>0];
        $grandQtyCount = 0;
        $grandQualSum  = 0;
        $grandTimeSum  = 0;

        foreach ($sections as $section) {
            $rows = [];
            foreach ($section['rows'] as $row) {
                $qtyTotal  = array_sum($row['qty']);
                $qualTotal = $qtyTotal > 0 ? round(array_sum($row['quality']) / $qtyTotal, 2) : 0;
                $timeTotal = $qtyTotal > 0 ? round(array_sum($row['timeliness']) / $qtyTotal, 2) : 0;
                for ($w = 1; $w <= 4; $w++) $grandQty[$w] += $row['qty'][$w];
                $grandQtyCount += $qtyTotal;
                $grandQualSum  += array_sum($row['quality']);
                $grandTimeSum  += array_sum($row['timeliness']);
                $rows[] = [
                    'title'      => $row['title'],
                    'qty'        => $row['qty'],
                    'qty_total'  => $qtyTotal,
                    'quality'    => array_map(fn($v, $q) => $q > 0 ? round($v / $q, 1) : 0, $row['quality'], $row['qty']),
                    'qual_avg'   => $qualTotal,
                    'timeliness' => array_map(fn($v, $q) => $q > 0 ? round($v / $q, 1) : 0, $row['timeliness'], $row['qty']),
                    'time_avg'   => $timeTotal,
                ];
            }
            $result[] = ['key' => $section['key'], 'label' => $section['label'], 'weight' => $section['weight'], 'rows' => $rows];
        }

        return Inertia::render('Supervisor/Mpor/Show', [
            'mpor'         => [
                'id'             => $mpor->id,
                'month'          => $mpor->month,
                'status'         => $mpor->status,
                'submitted_at'   => $mpor->submitted_at?->format('M j, Y · h:i A'),
                'approved_at'    => $mpor->approved_at?->format('M j, Y · h:i A'),
                'endorsed_at'    => $mpor->endorsed_at?->format('M j, Y · h:i A'),
                'returned_at'    => $mpor->returned_at?->format('M j, Y · h:i A'),
                'return_remarks' => $mpor->return_remarks,
                'approved_by'    => $mpor->approvedBy?->name,
                'endorsed_by'    => $mpor->endorsedBy?->name,
                'returned_by'    => $mpor->returnedBy?->name,
            ],
            'employee'     => [
                'name'     => $mpor->employee?->name,
                'position' => $mpor->employee?->position,
                'office'   => $mpor->employee?->office?->name,
                'avatar'   => $mpor->employee?->profile_photo_url,
            ],
            'sections'        => $result,
            'grandQty'        => $grandQty,
            'grandQualAvg'    => $grandQtyCount > 0 ? round($grandQualSum / $grandQtyCount, 2) : 0,
            'grandTimeAvg'    => $grandQtyCount > 0 ? round($grandTimeSum / $grandQtyCount, 2) : 0,
            'grandQtyTotal'   => $grandQtyCount,
        ]);
    }

    public function approve(Mpor $mpor)
    {
        $user = Auth::user();
        abort_unless($mpor->office_id === $user->office_id, 403);
        abort_unless($mpor->status === 'submitted', 422, 'MPOR is not in submitted status.');

        $mpor->update([
            'status'      => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'endorsed_by' => null, 'endorsed_at' => null,
            'returned_by' => null, 'returned_at' => null, 'return_remarks' => null,
        ]);

        return back()->with('success', 'MPOR approved.');
    }

    public function return(Request $request, Mpor $mpor)
    {
        $user = Auth::user();
        abort_unless($mpor->office_id === $user->office_id, 403);
        abort_unless($mpor->status === 'submitted', 422, 'MPOR is not in submitted status.');

        $request->validate(['return_remarks' => ['nullable', 'string', 'max:2000']]);

        $mpor->update([
            'status'         => 'returned',
            'returned_by'    => $user->id,
            'returned_at'    => now(),
            'return_remarks' => $request->return_remarks,
            'submitted_at'   => null,
            'approved_by'    => null, 'approved_at'  => null,
            'endorsed_by'    => null, 'endorsed_at'  => null,
        ]);

        // Notify employee
        $mpor->employee?->notifications()->create([
            'id'   => \Illuminate\Support\Str::uuid(),
            'type' => 'App\Notifications\WorkflowEventNotification',
            'data' => json_encode([
                'event'   => 'mpor.returned_to_employee',
                'type'    => 'alert',
                'message' => 'Your MPOR for ' . $mpor->month . ' was returned by your supervisor.',
                'link'    => '/employee/mpor?month=' . $mpor->month,
            ]),
        ]);

        return back()->with('success', 'MPOR returned to employee.');
    }

    public function endorse(Mpor $mpor)
    {
        $user = Auth::user();
        abort_unless($mpor->office_id === $user->office_id, 403);
        abort_unless($mpor->status === 'approved', 422, 'MPOR must be approved before endorsing.');

        $mpor->update([
            'status'      => 'endorsed',
            'endorsed_by' => $user->id,
            'endorsed_at' => now(),
        ]);

        // Notify dept heads in same office
        $deptHeads = User::where('office_id', $user->office_id)->where('role', 'dept_head')->get();
        foreach ($deptHeads as $dh) {
            $dh->notifications()->create([
                'id'   => \Illuminate\Support\Str::uuid(),
                'type' => 'App\Notifications\WorkflowEventNotification',
                'data' => json_encode([
                    'event'   => 'mpor.endorsed_to_dept_head',
                    'type'    => 'info',
                    'message' => $mpor->employee?->name . '\'s MPOR for ' . $mpor->month . ' has been endorsed.',
                    'link'    => '/stage-two/mpor',
                ]),
            ]);
        }

        return back()->with('success', 'MPOR endorsed to Department Head.');
    }
}
