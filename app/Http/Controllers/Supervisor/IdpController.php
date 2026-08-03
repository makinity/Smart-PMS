<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Models\PerformancePeriod;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IdpController extends Controller
{
    private const LOCKED = [
        DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
        DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
        DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
        DevelopmentPlan::STATUS_RETURNED,
        DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
    ];

    public function index(Request $request)
    {
        $supervisor = auth()->user();

        $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();
        $periodId = $request->get('period_id');
        $period = $periodId ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current() : PerformancePeriod::current();

        $plans = DevelopmentPlan::where('supervisor_id', $supervisor->id)
            ->when($period, fn ($q) => $q->where('performance_period_id', $period->id))
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUBMITTED,
                DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
                DevelopmentPlan::STATUS_RETURNED,
                DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->with(['employee.employee.office', 'performancePeriod:id,name'])
            ->orderByRaw("FIELD(status, 'submitted', 'returned', 'supervisor_recommended', 'submitted_to_ld')")
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($p) => [
                'id'            => $p->id,
                'status'        => $p->status,
                'employee_name' => $p->employee?->name ?? '—',
                'employee_office' => $p->employee?->employee?->office?->name ?? '—',
                'employee_avatar' => $p->employee?->profile_photo_url,
                'position'      => $p->employee?->employee?->position ?? '—',
                'source_score'  => $p->source_score ? round((float) $p->source_score, 2) : null,
                'source_rating' => $p->source_rating,
                'period'        => $p->performancePeriod?->name ?? '—',
                'updated_at'    => $p->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('Supervisor/Idp/Index', [
            'plans' => $plans,
            'period' => $period,
            'allPeriods' => $allPeriods,
        ]);
    }

    public function show(DevelopmentPlan $idp)
    {
        abort_unless($idp->supervisor_id === auth()->id(), 403);

        $idp->load(['employee.employee.office', 'performancePeriod:id,name']);

        return Inertia::render('Supervisor/Idp/Show', [
            'plan' => [
                'id'               => $idp->id,
                'status'           => $idp->status,
                'source_score'     => $idp->source_score ? round((float) $idp->source_score, 2) : null,
                'source_rating'    => $idp->source_rating,
                'pmt_remarks'      => $idp->pmt_remarks,
                'supervisor_remarks' => $idp->supervisor_remarks,
                'idp_rows'         => $idp->idp_rows ?? [],
                'period'           => $idp->performancePeriod?->name,
                'prepared_by_name' => $idp->prepared_by_name,
                'updated_at'       => $idp->updated_at?->format('M d, Y g:i A'),
                'supervisor_action_at' => $idp->supervisor_action_at?->format('M d, Y'),
            ],
            'employee' => [
                'name'     => $idp->employee?->name ?? '—',
                'position' => $idp->employee?->employee?->position ?? '—',
                'office'   => $idp->employee?->employee?->office?->name ?? '—',
                'avatar'   => $idp->employee?->profile_photo_url,
            ],
        ]);
    }

    public function recommend(Request $request, DevelopmentPlan $idp)
    {
        abort_unless($idp->supervisor_id === auth()->id(), 403);
        abort_if(in_array($idp->status, self::LOCKED), 403, 'Already actioned.');

        // Resolve dept_head_id from AccomplishmentSubmission
        $deptHeadId = \App\Models\AccomplishmentSubmission::where('employee_id', $idp->employee_id)
            ->where('performance_period_id', $idp->performance_period_id)
            ->whereNotNull('dept_head_id')
            ->value('dept_head_id');

        $idp->update([
            'status'               => DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
            'supervisor_remarks'   => $request->input('remarks'),
            'supervisor_action_at' => now(),
            'recommended_by_name'  => auth()->user()->name,
            'dept_head_id'         => $deptHeadId,
            'updated_by'           => auth()->id(),
        ]);

        $idp->employee?->notify(new WorkflowEventNotification(
            type: 'success',
            event: 'development_plan.supervisor_recommended',
            message: 'Your IDP has been reviewed and recommended by your supervisor.',
            url: '/employee/idp',
        ));

        // Notify dept-head
        if ($deptHeadId) {
            $deptHead = \App\Models\User::find($deptHeadId);
            $deptHead?->notify(new WorkflowEventNotification(
                type: 'info',
                event: 'development_plan.submitted_to_dept_head',
                message: $idp->employee?->name . "'s Individual Development Plan has been recommended by their supervisor and is awaiting your approval.",
                url: '/dept-head/idp',
            ));
        }

        return back()->with('success', 'IDP recommended.');
    }

    public function return(Request $request, DevelopmentPlan $idp)
    {
        abort_unless($idp->supervisor_id === auth()->id(), 403);
        abort_if(in_array($idp->status, self::LOCKED), 403, 'Already actioned.');

        $data = $request->validate(['remarks' => ['required', 'string', 'max:2000']]);

        $idp->update([
            'status'               => DevelopmentPlan::STATUS_RETURNED,
            'supervisor_remarks'   => $data['remarks'],
            'supervisor_action_at' => now(),
            'updated_by'           => auth()->id(),
        ]);

        $idp->employee?->notify(new WorkflowEventNotification(
            type: 'warning',
            event: 'development_plan.returned_by_supervisor',
            message: 'Your IDP was returned by your supervisor. Please review the remarks and resubmit.',
            url: '/employee/idp',
        ));

        return back()->with('success', 'IDP returned to employee.');
    }
}
