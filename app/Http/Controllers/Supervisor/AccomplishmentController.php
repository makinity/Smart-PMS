<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AccomplishmentController extends Controller
{
    public function index()
    {
        $supervisor = auth()->user();

        $submissions = AccomplishmentSubmission::where('supervisor_id', $supervisor->id)
            ->whereIn('status', ['submitted_to_supervisor', 'supervisor_endorsed', 'dept_head_endorsed',
                'recommended_by_pmt', 'pmt_approved', 'released_by_pmt', 'returned_to_employee'])
            ->with(['employee.office', 'period'])
            ->orderByRaw("FIELD(status, 'submitted_to_supervisor', 'returned_to_employee', 'supervisor_endorsed', 'dept_head_endorsed', 'recommended_by_pmt', 'pmt_approved', 'released_by_pmt')")
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn($s) => [
                'id'             => $s->id,
                'status'         => $s->status,
                'dataset_source' => $s->dataset_source,
                'submitted_at'   => $s->submitted_at?->toIso8601String(),
                'employee_name'  => $s->employee?->name ?? '—',
                'employee_office'=> $s->employee?->office?->name ?? '—',
                'period'         => $s->period?->name ?? '—',
            ]);

        return Inertia::render('Supervisor/Accomplishment/Index', [
            'submissions' => $submissions,
        ]);
    }

    public function show(AccomplishmentSubmission $accomplishment)
    {
        $supervisor = auth()->user();
        abort_if($accomplishment->supervisor_id !== $supervisor->id, 403);

        $accomplishment->load(['employee.office', 'period', 'mpors']);

        $ipcr = Ipcr::where('employee_id', $accomplishment->employee_id)
            ->where('performance_period_id', $accomplishment->performance_period_id)
            ->with(['items.indicator.uwpMfo.uwpFunction', 'items.indicator.qetStandards'])
            ->first();

        $period = $accomplishment->period;

        return Inertia::render('Supervisor/Accomplishment/Show', [
            'submission' => $this->formatSubmission($accomplishment),
            'smporTable' => $period ? $this->buildSmporTable($accomplishment->mpors->pluck('id')->toArray(), $period) : null,
            'ipcrSections' => $ipcr && $period ? $this->buildIpcrSections($ipcr, $period) : [],
            'ipcrMeta'   => $ipcr ? $this->buildIpcrMeta($ipcr) : null,
        ]);
    }

    public function endorse(AccomplishmentSubmission $accomplishment)
    {
        $supervisor = auth()->user();
        abort_if($accomplishment->supervisor_id !== $supervisor->id, 403);
        abort_if($accomplishment->status !== 'submitted_to_supervisor', 422, 'Cannot endorse at this stage.');

        $accomplishment->update([
            'status'               => 'supervisor_endorsed',
            'supervisor_action_at' => now(),
        ]);

        $deptHead = \App\Models\User::find($accomplishment->dept_head_id);
        $deptHead?->notify(new WorkflowEventNotification(
            type:    'info',
            event:   'accomplishment.supervisor_endorsed',
            message: "{$accomplishment->employee->name}'s accomplishment has been endorsed by {$supervisor->name} and is ready for your review.",
            url:     '/dept-head/accomplishment-review',
        ));

        return back()->with('success', 'Accomplishment endorsed.');
    }

    public function return(Request $request, AccomplishmentSubmission $accomplishment)
    {
        $supervisor = auth()->user();
        abort_if($accomplishment->supervisor_id !== $supervisor->id, 403);

        $data = $request->validate(['remarks' => ['required', 'string', 'max:2000']]);

        $accomplishment->update([
            'status'               => 'returned_to_employee',
            'supervisor_remarks'   => $data['remarks'],
            'supervisor_action_at' => now(),
        ]);

        $accomplishment->employee->notify(new WorkflowEventNotification(
            type:    'warning',
            event:   'accomplishment.returned_to_employee',
            message: "{$supervisor->name} returned your accomplishment submission.",
            url:     '/employee/accomplishment',
        ));

        return back()->with('success', 'Submission returned to employee.');
    }

    // ── Helpers (reused from employee controller logic) ───────────────────────

    private function formatSubmission(AccomplishmentSubmission $s): array
    {
        return [
            'id'              => $s->id,
            'status'          => $s->status,
            'dataset_source'  => $s->dataset_source,
            'employee_remarks'=> $s->employee_remarks,
            'supervisor_remarks' => $s->supervisor_remarks,
            'attachments'     => collect($s->attachments ?? [])->map(fn($a) => [
                ...$a, 'url' => Storage::url($a['path']),
            ])->values()->all(),
            'submitted_at'    => $s->submitted_at?->toIso8601String(),
            'employee_name'   => $s->employee?->name ?? '—',
            'employee_office' => $s->employee?->office?->name ?? '—',
            'period'          => $s->period?->name ?? '—',
        ];
    }

    private function buildIpcrMeta(Ipcr $ipcr): array
    {
        return [
            'score'  => round((float)($ipcr->final_score ?? $ipcr->pmt_adjusted_score ?? 0), 2),
            'rating' => $ipcr->adjectival_rating ?? $ipcr->pmt_adjusted_rating ?? null,
        ];
    }

    private function buildSmporTable(array $mporIds, $period): array
    {
        if (empty($mporIds)) return ['months' => [], 'sections' => []];

        $start  = $period->start_date->copy()->startOfMonth();
        $end    = $period->end_date->copy()->endOfMonth();
        $months = [];
        for ($m = $start->copy(); $m->lte($end); $m->addMonth()) {
            $months[] = $m->format('M');
        }

        $entries = OrsEntry::whereIn('ipcr_item_id', function ($q) use ($mporIds) {
                $q->select('ipcr_items.id')->from('ipcr_items')
                  ->join('ipcrs', 'ipcrs.id', '=', 'ipcr_items.ipcr_id')
                  ->join('mpors', 'mpors.employee_id', '=', 'ipcrs.employee_id')
                  ->whereIn('mpors.id', $mporIds);
            })
            ->where('status', 'rated')->whereNotNull('quantity')
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
            ->get();

        $sections = [];
        foreach ($entries as $entry) {
            $mfo        = $entry->ipcrItem?->indicator?->uwpMfo;
            $fn         = $mfo?->uwpFunction;
            $fnType     = strtolower($fn?->name ?? 'core');
            $outputTitle= $mfo?->title ?? 'Other';
            $monthLabel = \Carbon\Carbon::parse($entry->work_date)->format('M');
            $mon        = $entry->monitoring->first();
            $qty        = (int) $entry->quantity;

            $sections[$fnType][$outputTitle][$monthLabel]['qty']      = ($sections[$fnType][$outputTitle][$monthLabel]['qty'] ?? 0) + $qty;
            $sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$outputTitle][$monthLabel]['time_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
        }

        $result = [];
        foreach ($sections as $fnType => $outputs) {
            $rows = [];
            foreach ($outputs as $title => $monthData) {
                $totalQty  = array_sum(array_column($monthData, 'qty'));
                $totalQual = array_sum(array_column($monthData, 'qual_pts'));
                $totalTime = array_sum(array_column($monthData, 'time_pts'));
                $row = ['output' => $title, 'months' => [], 'total_qty' => $totalQty,
                    'avg_qual' => $totalQty > 0 ? round($totalQual / $totalQty, 2) : 0,
                    'avg_time' => $totalQty > 0 ? round($totalTime / $totalQty, 2) : 0];
                foreach ($months as $m) {
                    $row['months'][$m] = $monthData[$m] ?? ['qty' => 0, 'qual_pts' => 0, 'time_pts' => 0];
                }
                $rows[] = $row;
            }
            $result[] = ['type' => $fnType, 'rows' => $rows];
        }

        return ['months' => $months, 'sections' => $result];
    }

    private function buildIpcrSections(Ipcr $ipcr, $period): array
    {
        $fnMap = [];
        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo       = $indicator?->uwpMfo;
            $fn        = $mfo?->uwpFunction;
            if (!$fn || !$mfo) continue;

            $fnMap[$fn->id] ??= ['id' => $fn->id, 'name' => $fn->name, 'weight' => $fn->weight_percent ?? null, 'mfos' => []];
            $fnMap[$fn->id]['mfos'][$mfo->id] ??= ['id' => $mfo->id, 'title' => $mfo->title, 'indicators' => []];

            $ratings = $this->computeRatings($item->id, $period);
            $fnMap[$fn->id]['mfos'][$mfo->id]['indicators'][] = [
                'id'             => $item->id,
                'indicator_text' => $indicator->indicator_text,
                'target_timeline'=> $indicator->target_timeline,
                'standards'      => $indicator->qetStandards->map(fn($s) => [
                    'dimension' => $s->dimension, 'rating' => $s->rating, 'standard_text' => $s->standard_text,
                ])->values()->all(),
                'ratings' => $ratings,
            ];
        }

        foreach ($fnMap as &$fn) { $fn['mfos'] = array_values($fn['mfos']); }
        return array_values($fnMap);
    }

    private function computeRatings(int $ipcrItemId, $period): array
    {
        $entries = OrsEntry::where('ipcr_item_id', $ipcrItemId)
            ->where('status', 'rated')->where('quantity', '>', 0)
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with(['monitoring', 'ipcrItem.indicator'])->get();

        if ($entries->isEmpty()) return ['Q' => null, 'E' => null, 'T' => null, 'A' => null];

        $totalQty = $entries->sum('quantity');
        $qualPts  = $entries->sum(fn($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
        $timePts  = $entries->sum(fn($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
        $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
        $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;
        $target = is_numeric($entries->first()?->ipcrItem?->indicator?->target_quantity)
            ? (float) $entries->first()->ipcrItem->indicator->target_quantity : null;
        $E = ($target && $target > 0) ? min(5.00, round(($totalQty / $target) * 5, 2)) : $Q;
        $A = ($Q !== null && $T !== null) ? round(($Q + $E + $T) / 3, 2) : null;

        return ['Q' => $Q, 'E' => $E, 'T' => $T, 'A' => $A];
    }
}
