<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use App\Notifications\WorkflowEventNotification;
use App\Services\LndHandoffService;
use App\Services\Stage4FormBuilderService;
use App\Services\WorkflowNotificationDispatcher;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

class DevelopmentPlanningController extends Controller
{
    private const LOW_RATINGS = ['Unsatisfactory', 'Poor'];

    public function __construct(private readonly Stage4FormBuilderService $forms) {}

    public function index(Request $request)
    {
        $period = PerformancePeriod::current();
        $search = trim($request->get('search', ''));
        $rating = $request->get('rating', '');

        $query = Ipcr::with(['employee:id,name', 'employee.employee.office:id,name'])
            ->whereIn('adjectival_rating', self::LOW_RATINGS)
            ->whereNotNull('final_score');

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        if ($rating && in_array($rating, self::LOW_RATINGS)) {
            $query->where('adjectival_rating', $rating);
        }

        if ($search !== '') {
            $query->whereHas('employee', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
            )->orWhereHas('employee.employee', fn ($q) => $q
                ->where('position', 'like', "%{$search}%")
            )->orWhereHas('employee.employee.office', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
            );
        }

        $ipcrs = $query->orderBy('final_score')->get();

        // Load released submissions to get the official PMT score
        $submissions = AccomplishmentSubmission::whereIn('ipcr_id', $ipcrs->pluck('id'))
            ->where('status', 'released_by_pmt')
            ->get(['ipcr_id', 'final_rating', 'final_adjectival_rating', 'pmt_remarks'])
            ->keyBy('ipcr_id');

        $plans = DevelopmentPlan::whereIn('ipcr_id', $ipcrs->pluck('id'))
            ->get()
            ->keyBy('ipcr_id');

        $performers = $ipcrs->map(function (Ipcr $ipcr) use ($plans, $submissions) {
            $plan = $plans->get($ipcr->id);
            $submission = $submissions->get($ipcr->id);
            $score = $this->forms->resolveIpcrScore($ipcr, $submission);
            $rating = $submission?->final_adjectival_rating
                ?: ($ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating);

            return [
                'ipcr_id'          => $ipcr->id,
                'name'             => $ipcr->employee?->name ?? '—',
                'position'         => $ipcr->employee?->position ?? '—',
                'office'           => $ipcr->employee?->office?->name ?? '—',
                'avatar'           => $ipcr->employee?->profile_photo_url,
                'score'            => $score,
                'rating'           => $rating,
                'plan_status'      => $plan?->status ?? '',
                'plan_status_label'=> $this->statusLabel($plan?->status),
                'lnd_sync_status'  => $plan?->lnd_sync_status ?? DevelopmentPlan::LND_SYNC_NOT_SENT,
            ];
        })->values();

        $counts = [
            'all' => $performers->count(),
            'Unsatisfactory' => $performers->where('rating', 'Unsatisfactory')->count(),
            'Poor' => $performers->where('rating', 'Poor')->count(),
        ];

        return Inertia::render('Pmt/DevelopmentPlanning/Index', [
            'performers' => $performers,
            'counts' => $counts,
            'search' => $search,
            'rating' => $rating,
            'period' => $period ? ['id' => $period->id, 'name' => $period->name, 'is_active' => $period->is_active] : null,
        ]);
    }

    public function show(int $ipcr)
    {
        $current = Ipcr::with(['employee.employee.office.head', 'performancePeriod'])->findOrFail($ipcr);
        $employee = $current->employee;

        abort_unless($employee, 404);

        // Load the released submission for this IPCR (official PMT score)
        $currentSubmission = AccomplishmentSubmission::where('ipcr_id', $current->id)
            ->where('status', 'released_by_pmt')
            ->first(['ipcr_id', 'final_rating', 'final_adjectival_rating', 'pmt_remarks']);

        // All rated IPCRs for this employee → performance history timeline (all periods)
        $history = Ipcr::with(['performancePeriod', 'items.indicator.uwpMfo.uwpFunction', 'items.indicator.qetStandards'])
            ->where('employee_id', $employee->id)
            ->whereNotNull('final_score')
            ->get()
            ->sortByDesc(fn (Ipcr $i) => $i->performancePeriod?->start_date)
            ->values();

        // Load submissions for all history IPCRs
        $historySubmissions = AccomplishmentSubmission::whereIn('ipcr_id', $history->pluck('id'))
            ->where('status', 'released_by_pmt')
            ->get(['ipcr_id', 'final_rating', 'final_adjectival_rating'])
            ->keyBy('ipcr_id');

        $periods = $history->map(function (Ipcr $i) use ($historySubmissions) {
            $period = $i->performancePeriod;
            $sub = $historySubmissions->get($i->id);
            $score = $this->forms->resolveIpcrScore($i, $sub);
            $rating = $sub?->final_adjectival_rating
                ?: ($i->pmt_adjusted_rating ?: ($i->adjectival_rating ?: $this->forms->toAdjectival($score)));
            $mpors = $period ? $this->forms->buildMporList($i->employee_id, $period) : [];
            $mporIds = array_column($mpors, 'id');

            return [
                'ipcr_id'      => $i->id,
                'period_id'    => $i->performance_period_id,
                'period_name'  => $period?->name ?? '—',
                'start_date'   => $period?->start_date?->toDateString(),
                'end_date'     => $period?->end_date?->toDateString(),
                'score'        => $score,
                'rating'       => $rating,
                'is_low'       => in_array($rating, self::LOW_RATINGS, true),
                'ipcrSections' => $period ? $this->forms->buildIpcrSections($i, $period) : [],
                'smporTable'   => $period ? $this->forms->buildSmporTable($mporIds, $period, $i) : ['months' => [], 'sections' => []],
                'mpors'        => $mpors,
            ];
        });

        $currentScore  = $this->forms->resolveIpcrScore($current, $currentSubmission);
        $currentRating = $currentSubmission?->final_adjectival_rating
            ?: ($current->pmt_adjusted_rating ?: $current->adjectival_rating);

        $skillGaps = $this->forms->buildSkillGaps($current);
        $plan = DevelopmentPlan::where('ipcr_id', $current->id)->first();
        $head = $employee->office?->head?->name ?? '';

        return Inertia::render('Pmt/DevelopmentPlanning/Show', [
            'employee' => [
                'id'       => $employee->id,
                'name'     => $employee->name,
                'position' => $employee->position ?? '—',
                'office'   => $employee->office?->name ?? '—',
                'dept_head'=> $head ?: '—',
                'avatar'   => $employee->profile_photo_url,
            ],
            'current' => [
                'ipcr_id'       => $current->id,
                'period_id'     => $current->performance_period_id,
                'period_name'   => $current->performancePeriod?->name ?? '—',
                'score'         => $currentScore,
                'rating'        => $currentRating,
                'is_calibrated' => $currentSubmission && abs($currentScore - round((float) $current->final_score, 2)) >= 0.01,
            ],
            'periods'    => $periods,
            'skillGaps'  => $skillGaps,
            'plan'       => $plan ? $this->formatPlan($plan) : null,
            'signatures' => [
                'prepared_by'     => $employee->name,
                'recommended_by'  => $head,
                'approved_by'     => $head,
            ],
        ]);
    }

    public function storeOrUpdate(Request $request, int $ipcr)
    {
        $current = Ipcr::with('employee.employee.office.head')->findOrFail($ipcr);
        abort_unless($current->employee, 404);

        $currentSubmission = AccomplishmentSubmission::where('ipcr_id', $current->id)
            ->where('status', 'released_by_pmt')
            ->first(['ipcr_id', 'final_rating', 'final_adjectival_rating']);

        $resolvedScore  = $this->forms->resolveIpcrScore($current, $currentSubmission);
        $resolvedRating = $currentSubmission?->final_adjectival_rating
            ?: ($current->pmt_adjusted_rating ?: $current->adjectival_rating);

        $data = $request->validate([
            'pmt_remarks' => ['nullable', 'string', 'max:2000'],
            'idp_rows' => ['array'],
            'idp_rows.*.performance_gap' => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.developmental_activity' => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.support_needed' => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.support_from_supervisor' => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.expected_completion' => ['nullable', 'string', 'max:100'],
            'idp_rows.*.results' => ['nullable', 'string', 'max:1000'],
        ]);

        $plan = DevelopmentPlan::where('ipcr_id', $current->id)->first();

        if ($plan && $plan->status === DevelopmentPlan::STATUS_SUBMITTED_TO_LD) {
            return back()->with('error', 'This development plan has already been submitted to L&D and can no longer be edited.');
        }

        $rows = collect($data['idp_rows'] ?? [])
            ->map(fn ($r) => [
                'performance_gap' => trim((string) ($r['performance_gap'] ?? '')),
                'developmental_activity' => trim((string) ($r['developmental_activity'] ?? '')),
                'support_needed' => trim((string) ($r['support_needed'] ?? '')),
                'support_from_supervisor' => trim((string) ($r['support_from_supervisor'] ?? '')),
                'expected_completion' => trim((string) ($r['expected_completion'] ?? '')),
                'results' => trim((string) ($r['results'] ?? '')),
            ])
            ->reject(fn ($r) => collect($r)->every(fn ($v) => $v === ''))
            ->values()
            ->all();

        $hasDetails = count($rows) > 0;
        $employee = $current->employee;
        $head = $employee->office?->head?->name;

        DevelopmentPlan::updateOrCreate(
            ['ipcr_id' => $current->id],
            [
                'employee_id' => $employee->id,
                'office_id' => $employee->office_id,
                'performance_period_id' => $current->performance_period_id,
                'source_score'  => $resolvedScore,
                'source_rating' => $resolvedRating,
                'status' => $hasDetails ? DevelopmentPlan::STATUS_DRAFT : DevelopmentPlan::STATUS_PENDING_DETAILS,
                'pmt_remarks' => $data['pmt_remarks'] ?? null,
                'idp_rows' => $rows,
                'prepared_by_name' => $employee->name,
                'recommended_by_name' => $head,
                'approved_by_name' => $head,
                'created_by' => $plan?->created_by ?? auth()->id(),
                'updated_by' => auth()->id(),
            ]
        );

        return back()->with('success', 'Development plan saved.');
    }

    public function submitToLd(int $plan, LndHandoffService $lnd, WorkflowNotificationDispatcher $dispatcher)
    {
        $developmentPlan = DevelopmentPlan::with('employee')->findOrFail($plan);

        if ($developmentPlan->status === DevelopmentPlan::STATUS_SUBMITTED_TO_LD) {
            return back()->with('error', 'This development plan was already submitted to L&D.');
        }

        if (empty($developmentPlan->idp_rows)) {
            return back()->with('error', 'Add at least one development activity row before submitting to L&D.');
        }

        try {
            $result = $lnd->sendDevelopmentPlan($developmentPlan);
        } catch (RuntimeException $e) {
            $developmentPlan->update([
                'lnd_sync_status' => DevelopmentPlan::LND_SYNC_FAILED,
                'lnd_last_error' => $e->getMessage(),
            ]);

            return back()->with('error', 'Could not submit to L&D: '.$e->getMessage());
        }

        $lndReferenceId = $result['lnd_reference_id'] ?? null;

        $developmentPlan->update([
            'status' => DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            'submitted_to_ld_at' => now(),
            'lnd_sync_status' => ($result['status'] ?? 'sent') === 'acknowledged'
                ? DevelopmentPlan::LND_SYNC_ACKNOWLEDGED
                : DevelopmentPlan::LND_SYNC_SENT,
            'lnd_reference_id' => $lndReferenceId,
            'lnd_synced_at' => now(),
            'lnd_last_error' => null,
            'updated_by' => auth()->id(),
        ]);

        // Lock the employee's PMS account — they must complete L&D training before logging back in.
        // training_locked and lnd_reference_id live on the employees table, not users.
        $developmentPlan->employee?->employee?->update([
            'training_locked'  => true,
            'lnd_reference_id' => $lndReferenceId,
        ]);

        if ($developmentPlan->employee) {
            $dispatcher->notifyUser($developmentPlan->employee, new WorkflowEventNotification(
                type: 'info',
                event: 'development_plan.submitted_to_ld',
                message: 'Your individual development plan has been submitted to the Learning & Development Section.',
                url: '/employee/dashboard',
            ));
        }

        return back()->with('success', 'Development plan submitted to L&D.');
    }

    public function savePmtRemarks(Request $request, DevelopmentPlan $plan)
    {
        $data = $request->validate(['pmt_remarks' => ['nullable', 'string', 'max:2000']]);
        $plan->update(['pmt_remarks' => $data['pmt_remarks'], 'updated_by' => auth()->id()]);
        return back()->with('success', 'Remarks saved.');
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            DevelopmentPlan::STATUS_DRAFT => 'Draft',
            DevelopmentPlan::STATUS_PENDING_DETAILS => 'Pending Details',
            DevelopmentPlan::STATUS_SUBMITTED_TO_LD => 'Submitted to L&D',
            default => 'No Plan Yet',
        };
    }

    private function formatPlan(DevelopmentPlan $plan): array
    {
        return [
            'id'                  => $plan->id,
            'status'              => $plan->status,
            'status_label'        => $this->statusLabel($plan->status),
            'pmt_remarks'         => $plan->pmt_remarks ?? '',
            'supervisor_remarks'  => $plan->supervisor_remarks ?? '',
            'dept_head_remarks'   => $plan->dept_head_remarks ?? '',
            'idp_rows'            => $plan->idp_rows ?? [],
            'lnd_sync_status'     => $plan->lnd_sync_status,
            'lnd_reference_id'    => $plan->lnd_reference_id,
            'lnd_synced_at'       => $plan->lnd_synced_at?->toIso8601String(),
            'lnd_last_error'      => $plan->lnd_last_error ?? '',
            'submitted_to_ld_at'  => $plan->submitted_to_ld_at?->toIso8601String(),
            'prepared_by_name'    => $plan->prepared_by_name,
            'recommended_by_name' => $plan->recommended_by_name,
            'approved_by_name'    => $plan->approved_by_name,
            'updated_at'          => $plan->updated_at?->toIso8601String(),
        ];
    }
}
