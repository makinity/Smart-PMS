<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\OrsEntry;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use App\Services\PerformanceRatingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AccomplishmentReviewController extends Controller
{
    public function index()
    {
        $deptHead = auth()->user();

        $submissions = AccomplishmentSubmission::where('dept_head_id', $deptHead->id)
            ->whereIn('status', [
                'supervisor_endorsed', 'dept_head_endorsed', 'pmt_calibrated',
                'released_by_pmt', 'returned_to_employee',
            ])
            ->with(['employee.office', 'period'])
            ->orderByRaw("FIELD(status, 'supervisor_endorsed', 'returned_to_employee', 'dept_head_endorsed', 'pmt_calibrated', 'released_by_pmt')")
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'status' => $s->status,
                'submitted_at' => $s->submitted_at?->toIso8601String(),
                'dept_head_flagged_for_calibration' => $s->dept_head_flagged_for_calibration,
                'employee_name' => $s->employee?->name ?? '—',
                'employee_office' => $s->employee?->office?->name ?? '—',
                'employee_avatar' => $s->employee?->profile_photo_url,
                'period' => $s->period?->name ?? '—',
            ]);

        return Inertia::render('DeptHead/AccomplishmentReview/Index', [
            'submissions' => $submissions,
        ]);
    }

    public function show(AccomplishmentSubmission $accomplishment)
    {
        $deptHead = auth()->user();
        abort_if($accomplishment->dept_head_id !== $deptHead->id, 403);

        $accomplishment->load(['employee.office', 'period', 'mpors']);

        $ipcr = Ipcr::where('employee_id', $accomplishment->employee_id)
            ->where('performance_period_id', $accomplishment->performance_period_id)
            ->with(['items.indicator.uwpMfo.uwpFunction', 'items.indicator.qetStandards'])
            ->first();

        $period = $accomplishment->period;

        $score = $this->computeOverallScore($accomplishment);

        $ipcrSections = $ipcr && $period ? $this->buildIpcrSections($ipcr, $period) : [];
        $typeScores = [];
        foreach ($ipcrSections as $fn) {
            $aRatings = [];
            foreach ($fn['mfos'] as $mfo) {
                foreach ($mfo['indicators'] as $ind) {
                    if ($ind['ratings']['A'] !== null) $aRatings[] = (float) $ind['ratings']['A'];
                }
            }
            if (!empty($aRatings)) {
                $avg = array_sum($aRatings) / count($aRatings);
                $weight = (float) ($fn['weight'] ?? 0);
                $typeScores[] = ['label' => $fn['name'], 'weight' => $weight, 'weighted_score' => round($avg * ($weight / 100), 2)];
            }
        }

        return Inertia::render('DeptHead/AccomplishmentReview/Show', [
            'submission'   => $this->formatSubmission($accomplishment),
            'smporTable'   => $period ? $this->buildSmporTable($accomplishment->mpors->pluck('id')->toArray(), $period, $ipcr) : null,
            'ipcrSections' => $ipcrSections,
            'ipcrMeta'     => $ipcr ? ['score' => $score, 'rating' => $this->toAdjectival($score), 'type_scores' => $typeScores] : null,
        ]);
    }

    public function endorse(Request $request, AccomplishmentSubmission $accomplishment)
    {
        $deptHead = auth()->user();
        abort_if($accomplishment->dept_head_id !== $deptHead->id, 403);
        abort_if($accomplishment->status !== 'supervisor_endorsed', 422, 'Cannot endorse at this stage.');

        $data = $request->validate([
            'remarks' => ['nullable', 'string', 'max:2000'],
            'flag_for_calibration' => ['boolean'],
        ]);

        $accomplishment->update([
            'status' => 'dept_head_endorsed',
            'dept_head_remarks' => $data['remarks'] ?? null,
            'dept_head_flagged_for_calibration' => $data['flag_for_calibration'] ?? false,
            'dept_head_action_at' => now(),
        ]);

        // Notify PMT members
        User::where('role', 'pmt')
            ->each(function (User $pmt) use ($accomplishment, $deptHead) {
                $flag = $accomplishment->dept_head_flagged_for_calibration ? ' (Flagged for Calibration)' : '';
                $pmt->notify(new WorkflowEventNotification(
                    type: 'info',
                    event: 'accomplishment.dept_head_endorsed',
                    message: "{$accomplishment->employee->name}'s accomplishment has been endorsed by {$deptHead->name}{$flag}.",
                    url: route('pmt.accomplishment-review.show', $accomplishment),
                ));
            });

        return back()->with('success', 'Accomplishment endorsed and forwarded to PMT.');
    }

    public function return(Request $request, AccomplishmentSubmission $accomplishment)
    {
        $deptHead = auth()->user();
        abort_if($accomplishment->dept_head_id !== $deptHead->id, 403);
        abort_if($accomplishment->status !== 'supervisor_endorsed', 422, 'Cannot return at this stage.');

        $data = $request->validate(['remarks' => ['required', 'string', 'max:2000']]);

        $accomplishment->update([
            'status' => 'returned_to_employee',
            'dept_head_remarks' => $data['remarks'],
            'dept_head_action_at' => now(),
        ]);

        $accomplishment->employee->notify(new WorkflowEventNotification(
            type: 'warning',
            event: 'accomplishment.returned_by_dept_head',
            message: "{$deptHead->name} returned your accomplishment submission. Please review the remarks and resubmit.",
            url: '/employee/accomplishment',
        ));

        return back()->with('success', 'Submission returned to employee.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function computeOverallScore(AccomplishmentSubmission $accomplishment): float
    {
        $ipcr = Ipcr::where('employee_id', $accomplishment->employee_id)
            ->where('performance_period_id', $accomplishment->performance_period_id)
            ->first();

        if (! $ipcr) {
            return 0.0;
        }

        // Use the system-computed final score saved on the IPCR
        $score = (float) ($ipcr->final_score ?? 0);

        if ($score <= 0) {
            $score = app(PerformanceRatingService::class)->calculateComputedScore($ipcr);
        }

        return round($score, 2);
    }

    private function toAdjectival(float $score): string
    {
        if ($score >= 4.5) {
            return 'Outstanding';
        }
        if ($score >= 3.5) {
            return 'Very Satisfactory';
        }
        if ($score >= 2.5) {
            return 'Satisfactory';
        }
        if ($score >= 1.5) {
            return 'Unsatisfactory';
        }

        return 'Poor';
    }

    private function formatSubmission(AccomplishmentSubmission $s): array
    {
        return [
            'id' => $s->id,
            'status' => $s->status,
            'dataset_source' => $s->dataset_source,
            'employee_remarks' => $s->employee_remarks,
            'supervisor_remarks' => $s->supervisor_remarks,
            'dept_head_remarks' => $s->dept_head_remarks,
            'dept_head_flagged_for_calibration' => $s->dept_head_flagged_for_calibration,
            'final_rating' => $s->final_rating,
            'final_adjectival_rating' => $s->final_adjectival_rating,
            'pmt_remarks' => $s->pmt_remarks,
            'attachments' => collect($s->attachments ?? [])->map(fn ($a) => [
                ...$a, 'url' => Storage::url($a['path']),
            ])->values()->all(),
            'submitted_at' => $s->submitted_at?->toIso8601String(),
            'supervisor_action_at' => $s->supervisor_action_at?->toIso8601String(),
            'employee_name' => $s->employee?->name ?? '—',
            'employee_office' => $s->employee?->office?->name ?? '—',
            'period' => $s->period?->name ?? '—',
        ];
    }

    private function buildSmporTable(array $mporIds, $period, ?Ipcr $ipcr = null): array
    {
        if (empty($mporIds) && ! $ipcr) {
            return ['months' => [], 'sections' => []];
        }

        $start = $period->start_date->copy()->startOfMonth();
        $end = $period->end_date->copy()->endOfMonth();
        $months = [];
        for ($m = $start->copy(); $m->lte($end); $m->addMonth()) {
            $months[] = $m->format('M');
        }

        $entries = empty($mporIds) ? collect() : OrsEntry::whereIn('ipcr_item_id', function ($q) use ($mporIds) {
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
        if ($ipcr) {
            $ipcr->loadMissing('items.indicator.uwpMfo.uwpFunction');
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) {
                    continue;
                }
                $fnType = strtolower($fn->name);
                if (! isset($sections[$fnType][$mfo->title])) {
                    $sections[$fnType][$mfo->title] = [];
                }
            }
        }
        foreach ($entries as $entry) {
            $mfo = $entry->ipcrItem?->indicator?->uwpMfo;
            $fn = $mfo?->uwpFunction;
            $fnType = strtolower($fn?->name ?? 'core');
            $outputTitle = $mfo?->title ?? 'Other';
            $monthLabel = Carbon::parse($entry->work_date)->format('M');
            $mon = $entry->monitoring->first();
            $qty = (int) $entry->quantity;

            $sections[$fnType][$outputTitle][$monthLabel]['qty'] = ($sections[$fnType][$outputTitle][$monthLabel]['qty'] ?? 0) + $qty;
            $sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$outputTitle][$monthLabel]['time_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
        }

        $result = [];
        foreach ($sections as $fnType => $outputs) {
            $rows = [];
            foreach ($outputs as $title => $monthData) {
                $totalQty = array_sum(array_column($monthData, 'qty'));
                $totalQual = array_sum(array_column($monthData, 'qual_pts'));
                $totalTime = array_sum(array_column($monthData, 'time_pts'));
                $row = ['output' => $title, 'months' => [], 'total_qty' => $totalQty,
                    'avg_qual' => $totalQty > 0 ? round($totalQual / $totalQty, 2) : 0,
                    'avg_time' => $totalQty > 0 ? round($totalTime / $totalQty, 2) : 0];
                foreach ($months as $mo) {
                    $row['months'][$mo] = $monthData[$mo] ?? ['qty' => 0, 'qual_pts' => 0, 'time_pts' => 0];
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
            $mfo = $indicator?->uwpMfo;
            $fn = $mfo?->uwpFunction;
            if (! $fn || ! $mfo) {
                continue;
            }

            $fnMap[$fn->id] ??= ['id' => $fn->id, 'name' => $fn->name, 'function_type' => $fn->function_type, 'weight' => $fn->weight_percent ?? null, 'mfos' => []];
            $fnMap[$fn->id]['mfos'][$mfo->id] ??= ['id' => $mfo->id, 'title' => $mfo->title, 'indicators' => []];

            $entries = OrsEntry::where('ipcr_item_id', $item->id)
                ->where('status', 'rated')->where('quantity', '>', 0)
                ->whereBetween('work_date', [$period->start_date, $period->end_date])
                ->with(['monitoring', 'ipcrItem.indicator'])->get();
            $totalQty = $entries->sum('quantity');
            $qualPts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
            $timePts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
            $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
            $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;
            $target = is_numeric($indicator->target_quantity) ? (float) $indicator->target_quantity : null;
            $E = ($target && $target > 0) ? min(5.00, round(($totalQty / $target) * 5, 2)) : $Q;
            $A = ($Q !== null && $T !== null) ? round(($Q + $E + $T) / 3, 2) : null;

            $fnMap[$fn->id]['mfos'][$mfo->id]['indicators'][] = [
                'id' => $item->id,
                'indicator_text' => $indicator->indicator_text,
                'target_timeline' => $indicator->target_timeline,
                'standards' => $indicator->qetStandards->map(fn ($s) => [
                    'dimension' => $s->dimension, 'rating' => $s->rating, 'standard_text' => $s->standard_text,
                ])->values()->all(),
                'ratings' => compact('Q', 'E', 'T', 'A'),
            ];
        }

        foreach ($fnMap as &$fn) {
            $fn['mfos'] = array_values($fn['mfos']);
        }

        return array_values($fnMap);
    }
}
