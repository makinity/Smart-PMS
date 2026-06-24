<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\OrsEntry;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use App\Services\OpcrOfficeRatingService;
use App\Services\PerformanceRatingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class OpcraAccomplishmentController extends Controller
{
    public function index()
    {
        $submissions = OpcraAccomplishmentSubmission::with(['office', 'period', 'deptHead'])
            ->orderByRaw("FIELD(status,'submitted','returned','released')")
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'office_name' => $s->office?->name ?? '—',
                'period' => $s->period?->name ?? '—',
                'dept_head_name' => $s->deptHead?->name ?? '—',
                'status' => $s->status,
                'computed_office_rating' => $s->computed_office_rating,
                'final_office_rating' => $s->final_office_rating,
                'final_adjectival_rating' => $s->final_adjectival_rating,
                'flagged_for_calibration' => $s->flagged_for_calibration,
                'submitted_at' => $s->submitted_at?->toIso8601String(),
                'employee_stats' => $this->employeeStats($s),
            ]);

        return Inertia::render('Pmt/OpcraAccomplishment/Index', [
            'submissions' => $submissions,
        ]);
    }

    public function show(OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        $opcraAccomplishment->load(['office', 'period', 'deptHead']);

        $employees = User::where('office_id', $opcraAccomplishment->office_id)
            ->where('role', 'employee')->get();

        $subMap = AccomplishmentSubmission::where('office_id', $opcraAccomplishment->office_id)
            ->where('performance_period_id', $opcraAccomplishment->performance_period_id)
            ->get()->keyBy('employee_id');

        $employeeData = $employees->map(fn ($emp) => [
            'id' => $emp->id,
            'name' => $emp->name,
            'avatar' => $emp->profile_photo_url,
            'position' => $emp->position ?? '—',
            'submission_id' => $subMap->get($emp->id)?->id,
            'system_score' => $subMap->get($emp->id) ? $this->computeScoreForSub($subMap->get($emp->id)) : null,
            'calibrated_rating' => $subMap->get($emp->id)?->pmt_remarks ? $subMap->get($emp->id)?->final_rating : null,
            'pmt_remarks' => $subMap->get($emp->id)?->pmt_remarks,
            'status' => $subMap->get($emp->id)?->status ?? 'not_submitted',
            'approved' => $subMap->get($emp->id)?->status === 'dept_head_approved',
        ])->values();

        // Office-level OPCR sections
        $approvedOpcr = \App\Models\Opcr::where('office_id', $opcraAccomplishment->office_id)
            ->where('performance_period_id', $opcraAccomplishment->performance_period_id)
            ->where('status', 'approved')
            ->first();

        $opcrSections = [];
        if ($approvedOpcr) {
            $ratingService = app(\App\Services\PerformanceRatingService::class);
            $scoreMap = $ratingService->buildConsolidatedOfficeOutputRatings($approvedOpcr);
            $fnMap = [];
            foreach ($scoreMap as $row) {
                $fnType = $row['function_type'] ?? 'core';
                $outputTitle = $row['output_title'] ?? '';
                $fnMap[$fnType] ??= ['function_type' => $fnType, 'weight_percent' => $row['weight_percent'], 'outputs' => []];
                $fnMap[$fnType]['outputs'][$outputTitle] ??= ['output_title' => $outputTitle, 'indicators' => []];
                $fnMap[$fnType]['outputs'][$outputTitle]['indicators'][] = [
                    'indicator_text' => $row['indicator_text'],
                    'Q' => $row['q'] > 0 ? $row['q'] : null,
                    'E' => $row['e'] > 0 ? $row['e'] : null,
                    'T' => $row['t'] > 0 ? $row['t'] : null,
                    'A' => $row['a'],  // keep 0 for weighted average computation
                ];
            }
            foreach ($fnMap as &$fn) {
                $fn['outputs'] = array_values($fn['outputs']);
            }
            $opcrSections = array_values($fnMap);
        }

        return Inertia::render('Pmt/OpcraAccomplishment/Show', [
            'submission' => [
                'id' => $opcraAccomplishment->id,
                'status' => $opcraAccomplishment->status,
                'computed_office_rating' => $opcraAccomplishment->computed_office_rating,
                'final_office_rating' => $opcraAccomplishment->final_office_rating,
                'final_adjectival_rating' => $opcraAccomplishment->final_adjectival_rating,
                'dept_head_remarks' => $opcraAccomplishment->dept_head_remarks,
                'flagged_for_calibration' => $opcraAccomplishment->flagged_for_calibration,
                'pmt_remarks' => $opcraAccomplishment->pmt_remarks,
                'submitted_at' => $opcraAccomplishment->submitted_at?->toIso8601String(),
            ],
            'officeInfo' => [
                'name' => $opcraAccomplishment->office?->name ?? '—',
                'period' => $opcraAccomplishment->period?->name ?? '—',
                'dept_head' => $opcraAccomplishment->deptHead?->name ?? '—',
            ],
            'employees' => $employeeData,
            'opcrSections' => $opcrSections,
        ]);
    }

    public function employeeShow(OpcraAccomplishmentSubmission $opcraAccomplishment, AccomplishmentSubmission $accomplishment)
    {
        abort_if($accomplishment->office_id !== $opcraAccomplishment->office_id, 403);

        $accomplishment->load(['employee.office', 'period', 'mpors']);

        $ipcr = Ipcr::where('employee_id', $accomplishment->employee_id)
            ->where('performance_period_id', $accomplishment->performance_period_id)
            ->with(['items.indicator.uwpMfo.uwpFunction', 'items.indicator.qetStandards'])
            ->first();

        $period = $accomplishment->period;
        $score  = $this->computeScoreForSub($accomplishment);

        $ipcrSections = $ipcr && $period ? $this->buildIpcrSections($ipcr, $period) : [];
        $typeScores   = [];
        foreach ($ipcrSections as $fn) {
            $aRatings = [];
            foreach ($fn['mfos'] as $mfo) {
                foreach ($mfo['indicators'] as $ind) {
                    if ($ind['ratings']['A'] !== null) $aRatings[] = (float) $ind['ratings']['A'];
                }
            }
            if (! empty($aRatings)) {
                $avg    = array_sum($aRatings) / count($aRatings);
                $weight = (float) ($fn['weight'] ?? 0);
                $typeScores[] = ['label' => $fn['name'], 'weight' => $weight, 'weighted_score' => round($avg * ($weight / 100), 2)];
            }
        }

        return Inertia::render('Pmt/OpcraAccomplishment/EmployeeShow', [
            'opcraId'      => $opcraAccomplishment->id,
            'submission'   => $this->formatSubmission($accomplishment),
            'smporTable'   => $period ? $this->buildSmporTable($accomplishment->mpors->pluck('id')->toArray(), $period, $ipcr) : null,
            'ipcrSections' => $ipcrSections,
            'ipcrMeta'     => $ipcr ? ['score' => $score, 'rating' => $this->toAdjectival($score), 'type_scores' => $typeScores] : null,
        ]);
    }

    /** Draft-calibrate a single employee score (not final — just stored as pmt_remarks + temp final_rating) */
    public function calibrateEmployee(Request $request, OpcraAccomplishmentSubmission $opcraAccomplishment, AccomplishmentSubmission $accomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot calibrate at this stage.');
        abort_if($accomplishment->office_id !== $opcraAccomplishment->office_id, 403);

        $data = $request->validate([
            'final_rating' => ['required', 'numeric', 'min:1', 'max:5'],
            'final_adjectival_rating' => ['required', 'string', 'in:Outstanding,Very Satisfactory,Satisfactory,Unsatisfactory,Poor'],
            'pmt_remarks' => ['required', 'string', 'max:2000'],
        ]);

        // Store calibrated values as draft (status stays dept_head_approved until OPCR release)
        $accomplishment->update([
            'final_rating' => $data['final_rating'],
            'final_adjectival_rating' => $data['final_adjectival_rating'],
            'pmt_remarks' => $data['pmt_remarks'],
            'pmt_id' => auth()->id(),
        ]);

        // Recompute office rating and update computed_office_rating (draft)
        $newOfficeRating = $this->computeOfficeRating($opcraAccomplishment);
        $opcraAccomplishment->update(['computed_office_rating' => $newOfficeRating]);

        return back()->with('success', 'Employee score calibrated.');
    }

    public function release(OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot release at this stage.');

        $score = (float) $opcraAccomplishment->computed_office_rating;

        $opcraAccomplishment->update([
            'status' => 'released',
            'final_office_rating' => $score,
            'final_adjectival_rating' => $this->toAdjectival($score),
            'pmt_member_id' => auth()->id(),
            'pmt_action_at' => now(),
        ]);

        $this->finalizeEmployees($opcraAccomplishment);
        $this->notifyDeptHead($opcraAccomplishment,
            "Your office OPCR Accomplishment has been officially released by PMT. Final rating: {$this->toAdjectival($score)} ({$score}).");

        return back()->with('success', 'Office accomplishment released.');
    }

    public function calibrateAndRelease(Request $request, OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot calibrate at this stage.');

        $data = $request->validate([
            'final_office_rating' => ['required', 'numeric', 'min:1', 'max:5'],
            'final_adjectival_rating' => ['required', 'string', 'in:Outstanding,Very Satisfactory,Satisfactory,Unsatisfactory,Poor'],
            'pmt_remarks' => ['required', 'string', 'max:2000'],
        ]);

        $opcraAccomplishment->update([
            'status' => 'released',
            'final_office_rating' => $data['final_office_rating'],
            'final_adjectival_rating' => $data['final_adjectival_rating'],
            'pmt_remarks' => $data['pmt_remarks'],
            'pmt_member_id' => auth()->id(),
            'pmt_action_at' => now(),
        ]);

        $this->finalizeEmployees($opcraAccomplishment);
        $this->notifyDeptHead($opcraAccomplishment,
            "Your office OPCR Accomplishment has been calibrated and released. Final rating: {$data['final_adjectival_rating']} ({$data['final_office_rating']}).");

        return back()->with('success', 'Office accomplishment calibrated and released.');
    }

    public function return(Request $request, OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot return at this stage.');

        $data = $request->validate(['pmt_remarks' => ['required', 'string', 'max:2000']]);

        $opcraAccomplishment->update([
            'status' => 'returned',
            'pmt_remarks' => $data['pmt_remarks'],
            'pmt_member_id' => auth()->id(),
            'pmt_action_at' => now(),
        ]);

        $this->notifyDeptHead($opcraAccomplishment, 'Your OPCR Accomplishment submission was returned by PMT. Please review the remarks.');

        return back()->with('success', 'Submission returned to Department Head.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Finalize all dept_head_approved employees under this OPCR on release */
    private function finalizeEmployees(OpcraAccomplishmentSubmission $opcra): void
    {
        $submissions = AccomplishmentSubmission::where('office_id', $opcra->office_id)
            ->where('performance_period_id', $opcra->performance_period_id)
            ->where('status', 'dept_head_approved')
            ->get();

        foreach ($submissions as $s) {
            // If not yet calibrated, compute the score now
            if (! $s->final_rating) {
                $score    = $this->computeScoreForSub($s);
                $adjectival = $this->toAdjectival($score);
                $s->update([
                    'final_rating' => $score,
                    'final_adjectival_rating' => $adjectival,
                ]);
            }

            $s->update([
                'status' => 'released_by_pmt',
                'pmt_id' => auth()->id(),
                'pmt_action_at' => now(),
            ]);

            $s->employee?->notify(new WorkflowEventNotification(
                type: 'success',
                event: 'accomplishment.released_by_pmt',
                message: "Your final rating has been released: {$s->final_adjectival_rating} ({$s->final_rating}).",
                url: '/employee/accomplishment',
            ));

            $this->autoInitiateIdp($s);
        }
    }

    private function autoInitiateIdp(AccomplishmentSubmission $s): void
    {
        if (! in_array($s->final_adjectival_rating, ['Poor', 'Unsatisfactory'], true)) return;

        $ipcr = Ipcr::where('employee_id', $s->employee_id)
            ->where('performance_period_id', $s->performance_period_id)
            ->first();
        if (! $ipcr || DevelopmentPlan::where('ipcr_id', $ipcr->id)->exists()) return;

        DevelopmentPlan::create([
            'ipcr_id' => $ipcr->id,
            'employee_id' => $s->employee_id,
            'office_id' => $s->employee?->office_id,
            'performance_period_id' => $s->performance_period_id,
            'source_score' => $s->final_rating,
            'source_rating' => $s->final_adjectival_rating,
            'status' => DevelopmentPlan::STATUS_PENDING_DETAILS,
            'prepared_by_name' => $s->employee?->name,
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);

        $s->employee?->notify(new WorkflowEventNotification(
            type: 'warning',
            event: 'development_plan.assigned_to_employee',
            message: "Your performance score ({$s->final_adjectival_rating}) requires an Individual Development Plan.",
            url: '/employee/idp',
        ));
    }

    /** Recompute office rating from approved employees' final_rating (calibrated drafts or system scores) */
    private function computeOfficeRating(OpcraAccomplishmentSubmission $opcra): float
    {
        $submissions = AccomplishmentSubmission::where('office_id', $opcra->office_id)
            ->where('performance_period_id', $opcra->performance_period_id)
            ->where('status', 'dept_head_approved')
            ->get();

        if ($submissions->isEmpty()) return 0.0;

        $scores = $submissions->map(function ($s) {
            return $s->final_rating ?? $this->computeScoreForSub($s);
        })->filter(fn ($v) => $v > 0);

        return $scores->isNotEmpty() ? round($scores->avg(), 2) : 0.0;
    }

    private function computeScoreForSub(AccomplishmentSubmission $s): float
    {
        $ipcr = Ipcr::where('employee_id', $s->employee_id)
            ->where('performance_period_id', $s->performance_period_id)
            ->first();
        if (! $ipcr) return 0.0;
        $score = (float) ($ipcr->final_score ?? 0);
        if ($score <= 0) $score = app(PerformanceRatingService::class)->calculateComputedScore($ipcr);
        return round($score, 2);
    }

    private function toAdjectival(float $score): string
    {
        if ($score >= 4.5) return 'Outstanding';
        if ($score >= 3.5) return 'Very Satisfactory';
        if ($score >= 2.5) return 'Satisfactory';
        if ($score >= 1.5) return 'Unsatisfactory';
        return 'Poor';
    }

    private function employeeStats(OpcraAccomplishmentSubmission $s): array
    {
        $total    = User::where('office_id', $s->office_id)->where('role', 'employee')->count();
        $approved = AccomplishmentSubmission::where('office_id', $s->office_id)
            ->where('performance_period_id', $s->performance_period_id)
            ->where('status', 'dept_head_approved')->count();
        return ['approved' => $approved, 'total' => $total];
    }

    private function notifyDeptHead(OpcraAccomplishmentSubmission $s, string $message): void
    {
        $deptHead = User::find($s->dept_head_id);
        $deptHead?->notify(new WorkflowEventNotification(
            type: $s->status === 'released' ? 'success' : 'warning',
            event: "opcra.{$s->status}",
            message: $message,
            url: '/dept-head/opcr-accomplishment',
        ));
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
            'pmt_remarks' => $s->pmt_remarks,
            'final_rating' => $s->final_rating,
            'final_adjectival_rating' => $s->final_adjectival_rating,
            'attachments' => collect($s->attachments ?? [])->map(fn ($a) => [
                ...$a, 'url' => Storage::url($a['path']),
            ])->values()->all(),
            'submitted_at' => $s->submitted_at?->toIso8601String(),
            'employee_name' => $s->employee?->name ?? '—',
            'employee_office' => $s->employee?->office?->name ?? '—',
            'employee_avatar' => $s->employee?->profile_photo_url,
            'period' => $s->period?->name ?? '—',
        ];
    }

    private function buildSmporTable(array $mporIds, $period, ?Ipcr $ipcr = null): array
    {
        if (empty($mporIds) && ! $ipcr) return ['months' => [], 'sections' => []];

        $start = $period->start_date->copy()->startOfMonth();
        $end   = $period->end_date->copy()->endOfMonth();
        $months = [];
        for ($m = $start->copy(); $m->lte($end); $m->addMonth()) $months[] = $m->format('M');

        $entries = empty($mporIds) ? collect() : OrsEntry::whereIn('ipcr_item_id', function ($q) use ($mporIds) {
            $q->select('ipcr_items.id')->from('ipcr_items')
                ->join('ipcrs', 'ipcrs.id', '=', 'ipcr_items.ipcr_id')
                ->join('mpors', 'mpors.employee_id', '=', 'ipcrs.employee_id')
                ->whereIn('mpors.id', $mporIds);
        })->where('status', 'rated')->whereNotNull('quantity')
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])->get();

        $sections = [];
        if ($ipcr) {
            $ipcr->loadMissing('items.indicator.uwpMfo.uwpFunction');
            foreach ($ipcr->items as $item) {
                $fn  = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) continue;
                $sections[strtolower($fn->name)][$mfo->title] ??= [];
            }
        }
        foreach ($entries as $entry) {
            $mfo    = $entry->ipcrItem?->indicator?->uwpMfo;
            $fn     = $mfo?->uwpFunction;
            $fnType = strtolower($fn?->name ?? 'core');
            $title  = $mfo?->title ?? 'Other';
            $month  = Carbon::parse($entry->work_date)->format('M');
            $mon    = $entry->monitoring->first();
            $qty    = (int) $entry->quantity;
            $sections[$fnType][$title][$month]['qty']      = ($sections[$fnType][$title][$month]['qty'] ?? 0) + $qty;
            $sections[$fnType][$title][$month]['qual_pts'] = ($sections[$fnType][$title][$month]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$title][$month]['time_pts'] = ($sections[$fnType][$title][$month]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
        }

        $fnWeights = [];
        if ($ipcr) {
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                if ($fn) $fnWeights[strtolower($fn->name)] = (int) round((float) $fn->weight_percent);
            }
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
                foreach ($months as $mo) $row['months'][$mo] = $monthData[$mo] ?? ['qty' => 0, 'qual_pts' => 0, 'time_pts' => 0];
                $rows[] = $row;
            }
            $result[] = ['type' => $fnType, 'weight' => $fnWeights[$fnType] ?? 0, 'rows' => $rows];
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
            if (! $fn || ! $mfo) continue;

            $fnMap[$fn->id] ??= ['id' => $fn->id, 'name' => $fn->name, 'function_type' => $fn->function_type, 'weight' => $fn->weight_percent ?? null, 'mfos' => []];
            $fnMap[$fn->id]['mfos'][$mfo->id] ??= ['id' => $mfo->id, 'title' => $mfo->title, 'indicators' => []];

            $entries  = OrsEntry::where('ipcr_item_id', $item->id)->where('status', 'rated')->where('quantity', '>', 0)
                ->whereBetween('work_date', [$period->start_date, $period->end_date])->with('monitoring')->get();
            $totalQty = $entries->sum('quantity');
            $qualPts  = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
            $timePts  = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
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

        foreach ($fnMap as &$fn) $fn['mfos'] = array_values($fn['mfos']);
        return array_values($fnMap);
    }
}
