<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\Opcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
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
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();

        if (! $period) {
            return Inertia::render('DeptHead/OpcraAccomplishment/Index', [
                'period' => null,
                'submission' => null,
                'employees' => [],
                'stats' => ['approved' => 0, 'total' => 0],
            ]);
        }

        $employees = User::where('office_id', $deptHead->office_id)
            ->where('role', 'employee')
            ->get();

        $subMap = AccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->get()
            ->keyBy('employee_id');

        $ipcrMap = \App\Models\Ipcr::where('performance_period_id', $period->id)
            ->whereIn('employee_id', $employees->pluck('id'))
            ->get()
            ->keyBy('employee_id');

        $employeeData = $employees->map(fn ($emp) => [
            'id' => $emp->id,
            'name' => $emp->name,
            'position' => $emp->position ?? '-',
            'avatar' => $emp->profile_photo_url,
            'system_score' => $ipcrMap->get($emp->id)?->final_score ? (float) $ipcrMap->get($emp->id)->final_score : null,
            'final_rating' => $subMap->get($emp->id)?->final_rating,
            'adjectival' => $subMap->get($emp->id)?->final_adjectival_rating,
            'status' => $subMap->get($emp->id)?->status ?? 'not_submitted',
            'approved' => in_array($subMap->get($emp->id)?->status, ['dept_head_approved', 'released_by_pmt']),
            'released' => $subMap->get($emp->id)?->status === 'released_by_pmt',
            'submission_id' => $subMap->get($emp->id)?->id,
        ])->values();

        $submission = OpcraAccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->first();

        $approvedOpcr = Opcr::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->with(['period', 'office', 'uwps.uwpFunctions.mfos.successIndicators.assignments.employee'])
            ->first();

        $approved = $employeeData->where('approved', true)->count();

        // Office-level OPCR sections (only if approved OPCR exists)
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

        return Inertia::render('DeptHead/OpcraAccomplishment/Index', [
            'period' => ['id' => $period->id, 'name' => $period->name],
            'submission' => $submission ? [
                'id' => $submission->id,
                'status' => $submission->status,
                'computed_office_rating' => $submission->computed_office_rating,
                'final_office_rating' => $submission->final_office_rating,
                'final_adjectival_rating' => $submission->final_adjectival_rating,
                'dept_head_remarks' => $submission->dept_head_remarks,
                'flagged_for_calibration' => $submission->flagged_for_calibration,
                'pmt_remarks' => $submission->pmt_remarks,
                'submitted_at' => $submission->submitted_at?->toIso8601String(),
            ] : null,
            'employees' => $employeeData,
            'stats' => ['approved' => $approved, 'total' => $employeeData->count()],
            'hasApprovedOpcr' => (bool) $approvedOpcr,
            'approvedOpcrId' => $approvedOpcr?->id,
            'opcrSections' => $opcrSections,
        ]);
    }

    public function employeeShow(AccomplishmentSubmission $accomplishment)
    {
        $deptHead = auth()->user();
        abort_if($accomplishment->dept_head_id !== $deptHead->id, 403);

        $accomplishment->load(['employee.office', 'period', 'mpors']);

        $ipcr = \App\Models\Ipcr::where('employee_id', $accomplishment->employee_id)
            ->where('performance_period_id', $accomplishment->performance_period_id)
            ->with(['items.indicator.uwpMfo.uwpFunction', 'items.indicator.qetStandards'])
            ->first();

        $period = $accomplishment->period;
        $score  = $this->computeOverallScore($accomplishment);

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

        return Inertia::render('DeptHead/OpcraAccomplishment/EmployeeShow', [
            'submission'   => $this->formatSubmission($accomplishment),
            'smporTable'   => $period ? $this->buildSmporTable($accomplishment->mpors->pluck('id')->toArray(), $period, $ipcr) : null,
            'ipcrSections' => $ipcrSections,
            'ipcrMeta'     => $ipcr ? ['score' => $score, 'rating' => $this->toAdjectival($score), 'type_scores' => $typeScores] : null,
        ]);
    }

    public function export()
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 404);

        $approvedOpcr = Opcr::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->latest('id')
            ->first();

        abort_unless($approvedOpcr, 422, 'No approved OPCR found for the active performance period.');

        $request = request();
        $request->merge(['opcr_id' => $approvedOpcr->id]);

        return app(\App\Http\Controllers\StageThree\Forms\OpcrExcelExportController::class)->export($request);
    }

    public function resetForReview()
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $submission = OpcraAccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        $approvedOpcr = Opcr::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->first();

        $scores = AccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'dept_head_approved')
            ->get()
            ->map(fn ($s) => $s->final_rating
                ?? app(\App\Services\PerformanceRatingService::class)->calculateComputedScore(
                    \App\Models\Ipcr::where('employee_id', $s->employee_id)
                        ->where('performance_period_id', $s->performance_period_id)
                        ->first()
                )
            )->filter(fn ($v) => $v > 0);

        $computedRating = $scores->isNotEmpty() ? round($scores->avg(), 2) : 0.0;

        $submission->update([
            'status' => 'draft',
            'computed_office_rating' => $computedRating,
            'final_office_rating' => null,
            'final_adjectival_rating' => null,
            'pmt_member_id' => null,
            'pmt_remarks' => null,
            'pmt_action_at' => null,
        ]);

        // Reset released employees back to dept_head_approved
        AccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'released_by_pmt')
            ->update(['status' => 'dept_head_approved', 'pmt_id' => null, 'pmt_action_at' => null]);

        return back()->with('success', 'OPCR accomplishment reset to PMT review.');
    }

    public function submit(Request $request)
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $data = $request->validate([
            'remarks' => ['nullable', 'string', 'max:2000'],
            'flagged_for_calibration' => ['boolean'],
        ]);

        $approvedOpcr = Opcr::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->first();

        abort_unless($approvedOpcr, 422, 'No approved OPCR found for the active performance period.');

        // Ensure at least one approved employee
        $hasApproved = AccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->whereIn('status', ['dept_head_approved', 'released_by_pmt'])
            ->exists();

        abort_if(! $hasApproved, 422, 'No approved employee accomplishments found. Please approve at least one employee first.');

        $approvedSubs = AccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->whereIn('status', ['dept_head_approved', 'released_by_pmt'])
            ->get();

        $scores = $approvedSubs->map(fn ($s) => $s->final_rating
            ?? app(\App\Services\PerformanceRatingService::class)->calculateComputedScore(
                \App\Models\Ipcr::where('employee_id', $s->employee_id)
                    ->where('performance_period_id', $s->performance_period_id)
                    ->first()
            )
        )->filter(fn ($v) => $v > 0);

        $computedRating = $scores->isNotEmpty() ? round($scores->avg(), 2) : 0.0;

        $submission = OpcraAccomplishmentSubmission::updateOrCreate(
            ['office_id' => $deptHead->office_id, 'performance_period_id' => $period->id],
            [
                'dept_head_id' => $deptHead->id,
                'status' => 'submitted',
                'computed_office_rating' => $computedRating,
                'dept_head_remarks' => $data['remarks'] ?? null,
                'flagged_for_calibration' => $data['flagged_for_calibration'] ?? false,
                'submitted_at' => now(),
            ]
        );

        User::where('role', 'pmt')->each(function (User $pmt) use ($deptHead, $submission) {
            $flag = $submission->flagged_for_calibration ? ' (Flagged for Calibration)' : '';
            $pmt->notify(new WorkflowEventNotification(
                type: 'info',
                event: 'opcra.submitted_to_pmt',
                message: "{$deptHead->office?->name} OPCR Accomplishment submitted by {$deptHead->name}{$flag}.",
                url: '/pmt/opcr-accomplishment',
            ));
        });

        return back()->with('success', 'OPCR Accomplishment submitted to PMT.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function computeOverallScore(AccomplishmentSubmission $accomplishment): float
    {
        $ipcr = Ipcr::where('employee_id', $accomplishment->employee_id)
            ->where('performance_period_id', $accomplishment->performance_period_id)
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

    private function formatSubmission(AccomplishmentSubmission $s): array
    {
        return [
            'id' => $s->id,
            'status' => $s->status,
            'dataset_source' => $s->dataset_source,
            'employee_remarks' => $s->employee_remarks,
            'supervisor_remarks' => $s->supervisor_remarks,
            'dept_head_remarks' => $s->dept_head_remarks,
            'final_rating' => $s->final_rating,
            'final_adjectival_rating' => $s->final_adjectival_rating,
            'pmt_remarks' => $s->pmt_remarks,
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
            $sections[$fnType][$title][$month]['qty']       = ($sections[$fnType][$title][$month]['qty'] ?? 0) + $qty;
            $sections[$fnType][$title][$month]['qual_pts']  = ($sections[$fnType][$title][$month]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$title][$month]['time_pts']  = ($sections[$fnType][$title][$month]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
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

            $entries   = OrsEntry::where('ipcr_item_id', $item->id)->where('status', 'rated')->where('quantity', '>', 0)
                ->whereBetween('work_date', [$period->start_date, $period->end_date])->with(['monitoring', 'ipcrItem.indicator'])->get();
            $totalQty  = $entries->sum('quantity');
            $qualPts   = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
            $timePts   = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
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
