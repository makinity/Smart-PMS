<?php

namespace App\Http\Controllers\Employee;

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
        $user  = Auth::user();
        $month = $request->get('month', now()->format('Y-m'));

        // Validate month format
        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = now()->format('Y-m');
        }

        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        // Check committed IPCR
        $ipcr = Ipcr::where('employee_id', $user->id)
            ->whereIn('status', ['committed', 'for_commitment'])
            ->latest()
            ->first();

        // Load rated ORS entries for the month
        $entries = OrsEntry::with([
            'ipcrItem.indicator.uwpMfo.uwpFunction',
            'monitoring',
        ])
            ->where('employee_id', $user->id)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$start, $end])
            ->get()
            ->filter(function ($entry) {
                $m = $entry->monitoring->first();
                return $m && $m->quality_rating !== null && $m->timeliness_rating !== null;
            });

        // All rated entries in month (for excluded count)
        $allRatedCount = OrsEntry::where('employee_id', $user->id)
            ->where('status', 'rated')
            ->whereBetween('work_date', [$start, $end])
            ->count();

        $includedCount = $entries->count();
        $excludedCount = $allRatedCount - $includedCount;

        // Week helper
        $weekOf = fn($date) => match (true) {
            $date->day <= 7  => 1,
            $date->day <= 14 => 2,
            $date->day <= 21 => 3,
            default          => 4,
        };

        // Build rows grouped by indicator text + function section
        // Pre-seed all function sections from the committed IPCR so sections with
        // zero entries (e.g. Support Functions) still appear in the output.
        $sections = [];
        if ($ipcr) {
            $ipcr->loadMissing('items.indicator.uwpMfo.uwpFunction');
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                if (! $fn) continue;
                $key = $fn->function_type;
                if (! isset($sections[$key])) {
                    $sections[$key] = [
                        'key'    => $key,
                        'label'  => $fn->name,
                        'weight' => $fn->weight_percent,
                        'rows'   => [],
                    ];
                }
            }
        }

        foreach ($entries as $entry) {
            $indicator = $entry->ipcrItem?->indicator;
            if (! $indicator) continue;

            $mfo      = $indicator->uwpMfo;
            $function = $mfo?->uwpFunction;
            $fnType   = $function?->function_type ?? 'core';
            $fnName   = $function?->name ?? ($fnType === 'core' ? 'Core Functions' : 'Support Functions');
            $fnWeight = $function?->weight_percent ?? ($fnType === 'core' ? 80 : 20);
            $sectionKey = $fnType;

            $rowKey  = strtolower(trim($mfo?->title ?? 'Unknown'));
            $week    = $weekOf(Carbon::parse($entry->work_date));
            $mon     = $entry->monitoring->first();

            $qty  = (int) $entry->quantity;
            $qual = $qty * ($mon->quality_rating ?? 0);
            $time = $qty * ($mon->timeliness_rating ?? 0);

            if (! isset($sections[$sectionKey])) {
                $sections[$sectionKey] = [
                    'key'     => $sectionKey,
                    'label'   => $fnName,
                    'weight'  => $fnWeight,
                    'rows'    => [],
                ];
            }

            if (! isset($sections[$sectionKey]['rows'][$rowKey])) {
                $sections[$sectionKey]['rows'][$rowKey] = [
                    'title'    => $mfo?->title ?? 'Unknown',
                    'qty'      => [1 => 0, 2 => 0, 3 => 0, 4 => 0],
                    'quality'  => [1 => 0, 2 => 0, 3 => 0, 4 => 0],
                    'timeliness' => [1 => 0, 2 => 0, 3 => 0, 4 => 0],
                ];
            }

            $sections[$sectionKey]['rows'][$rowKey]['qty'][$week]        += $qty;
            $sections[$sectionKey]['rows'][$rowKey]['quality'][$week]    += $qual;
            $sections[$sectionKey]['rows'][$rowKey]['timeliness'][$week] += $time;
        }

        // Sort sections: core first
        ksort($sections);

        // Flatten rows + compute totals/averages
        $result = [];
        $grandQty       = [1 => 0, 2 => 0, 3 => 0, 4 => 0];
        $grandQuality   = [1 => 0, 2 => 0, 3 => 0, 4 => 0];
        $grandTimeliness= [1 => 0, 2 => 0, 3 => 0, 4 => 0];
        $grandQtyCount  = 0;
        $grandQualSum   = 0;
        $grandTimeSum   = 0;

        foreach ($sections as $section) {
            $rows = [];
            foreach ($section['rows'] as $row) {
                $qtyTotal  = array_sum($row['qty']);
                $qualTotal = $qtyTotal > 0 ? round(array_sum($row['quality']) / $qtyTotal, 2) : 0;
                $timeTotal = $qtyTotal > 0 ? round(array_sum($row['timeliness']) / $qtyTotal, 2) : 0;

                for ($w = 1; $w <= 4; $w++) {
                    $grandQty[$w]        += $row['qty'][$w];
                    $grandQuality[$w]    += $row['quality'][$w];
                    $grandTimeliness[$w] += $row['timeliness'][$w];
                }
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
            $result[] = [
                'key'    => $section['key'],
                'label'  => $section['label'],
                'weight' => $section['weight'],
                'rows'   => $rows,
            ];
        }

        $grandQualAvg = $grandQtyCount > 0 ? round($grandQualSum / $grandQtyCount, 2) : 0;
        $grandTimeAvg = $grandQtyCount > 0 ? round($grandTimeSum / $grandQtyCount, 2) : 0;

        // MPOR record
        $mpor = Mpor::where('employee_id', $user->id)->where('month', $month)->first();

        // Last activity label
        $lastActivity = null;
        if ($mpor) {
            if ($mpor->status === 'returned' && $mpor->returnedBy) {
                $lastActivity = ['label' => 'Returned by ' . $mpor->returnedBy->name, 'at' => $mpor->returned_at?->format('M j, Y · h:i A')];
            } elseif ($mpor->status === 'approved' && $mpor->approvedBy) {
                $lastActivity = ['label' => 'Approved by ' . $mpor->approvedBy->name, 'at' => $mpor->approved_at?->format('M j, Y · h:i A')];
            } elseif ($mpor->status === 'submitted') {
                $lastActivity = ['label' => 'Submitted by ' . $user->name, 'at' => $mpor->submitted_at?->format('M j, Y · h:i A')];
            }
        }

        // Supervisor name (same office)
        $supervisor = User::where('office_id', $user->office_id)
            ->where('role', 'supervisor')
            ->first();

        return Inertia::render('Employee/Mpor/Index', [
            'month'          => $month,
            'sections'       => $result,
            'grandQty'       => $grandQty,
            'grandQualAvg'   => $grandQualAvg,
            'grandTimeAvg'   => $grandTimeAvg,
            'grandQtyTotal'  => $grandQtyCount,
            'includedCount'  => $includedCount,
            'excludedCount'  => $excludedCount,
            'hasIpcr'        => (bool) $ipcr,
            'mpor'           => $mpor ? [
                'id'             => $mpor->id,
                'status'         => $mpor->status,
                'submitted_at'   => $mpor->submitted_at?->format('M j, Y · h:i A'),
                'return_remarks' => $mpor->return_remarks,
                'returned_by'    => $mpor->returnedBy?->name,
            ] : null,
            'lastActivity'   => $lastActivity,
            'employee'       => ['name' => $user->name, 'position' => $user->position],
            'supervisor'     => $supervisor ? ['name' => $supervisor->name, 'position' => $supervisor->position] : null,
        ]);
    }

    public function submit(Request $request)
    {
        $request->validate(['month' => ['required', 'regex:/^\d{4}-\d{2}$/']]);

        $user  = Auth::user();
        $month = $request->month;
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        // Must have committed IPCR
        $ipcr = Ipcr::where('employee_id', $user->id)
            ->whereIn('status', ['committed', 'for_commitment'])
            ->exists();
        abort_unless($ipcr, 422, 'No committed IPCR found.');

        // Must have rated entries
        $hasEntries = OrsEntry::with('monitoring')
            ->where('employee_id', $user->id)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$start, $end])
            ->get()
            ->filter(fn($e) => $e->monitoring->first()?->quality_rating !== null
                && $e->monitoring->first()?->timeliness_rating !== null)
            ->isNotEmpty();

        abort_unless($hasEntries, 422, 'No rated ORS entries found for this month.');

        $mpor = Mpor::firstOrNew(['employee_id' => $user->id, 'month' => $month]);

        abort_if(
            in_array($mpor->status, ['submitted', 'approved']),
            422,
            'MPOR is already ' . $mpor->status . '.'
        );

        $mpor->fill([
            'office_id'    => $user->office_id,
            'status'       => 'submitted',
            'submitted_at' => now(),
            'generated_at' => $mpor->generated_at ?? now(),
            'created_by'   => $mpor->created_by   ?? $user->id,
            'approved_by'  => null, 'approved_at'  => null,
            'returned_by'  => null, 'returned_at'  => null, 'return_remarks' => null,
        ])->save();

        // Notify supervisors in same office
        $supervisors = User::where('office_id', $user->office_id)
            ->where('role', 'supervisor')
            ->get();

        foreach ($supervisors as $sup) {
            $sup->notifications()->create([
                'id'   => \Illuminate\Support\Str::uuid(),
                'type' => 'App\Notifications\WorkflowEventNotification',
                'data' => json_encode([
                    'event'   => 'mpor.submitted_to_supervisor',
                    'type'    => 'info',
                    'message' => $user->name . ' submitted their MPOR for ' . $month,
                    'link'    => '/supervisor/mpor',
                ]),
            ]);
        }

        return back()->with('success', 'MPOR submitted successfully.');
    }
}
