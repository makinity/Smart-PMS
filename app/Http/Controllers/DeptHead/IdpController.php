<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IdpController extends Controller
{
    private const LOCKED = [
        DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
        DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
        DevelopmentPlan::STATUS_RETURNED,
        DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
    ];

    public function index()
    {
        $deptHead = auth()->user();

        $plans = DevelopmentPlan::where('dept_head_id', $deptHead->id)
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
                DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_RETURNED,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->with(['employee.office', 'performancePeriod:id,name'])
            ->orderByRaw("FIELD(status, 'supervisor_recommended', 'returned', 'dept_head_approved', 'submitted_to_pmt', 'submitted_to_ld')")
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'status'          => $p->status,
                'employee_name'   => $p->employee?->name ?? '—',
                'employee_id'     => $p->employee_id,
                'employee_office' => $p->employee?->office?->name ?? '—',
                'employee_avatar' => $p->employee?->profile_photo_url,
                'supervisor_id'   => $p->supervisor_id,
                'position'        => $p->employee?->position ?? '—',
                'source_score'    => $p->source_score ? round((float) $p->source_score, 2) : null,
                'source_rating'   => $p->source_rating,
                'period'          => $p->performancePeriod?->name ?? '—',
                'updated_at'      => $p->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('DeptHead/Idp/Index', [
            'plans' => $plans,
        ]);
    }

    public function officeIdp()
    {
        $deptHead = auth()->user();
        $deptHead->load('office');
        $office = $deptHead->office;

        $opcr = null;
        if ($office) {
            $opcr = \App\Models\OpcraAccomplishmentSubmission::where('office_id', $office->id)
                ->whereNotNull('final_office_rating')
                ->latest('performance_period_id')
                ->first();
        }

        $plans = DevelopmentPlan::where('dept_head_id', $deptHead->id)
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
                DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_RETURNED,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->with(['employee.office', 'performancePeriod:id,name'])
            ->orderByRaw("FIELD(status, 'supervisor_recommended', 'returned', 'dept_head_approved', 'submitted_to_pmt', 'submitted_to_ld')")
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'status'          => $p->status,
                'employee_name'   => $p->employee?->name ?? '—',
                'employee_id'     => $p->employee_id,
                'employee_office' => $p->employee?->office?->name ?? '—',
                'employee_avatar' => $p->employee?->profile_photo_url,
                'supervisor_id'   => $p->supervisor_id,
                'position'        => $p->employee?->position ?? '—',
                'source_score'    => $p->source_score ? round((float) $p->source_score, 2) : null,
                'source_rating'   => $p->source_rating,
                'period'          => $p->performancePeriod?->name ?? '—',
                'updated_at'      => $p->updated_at?->toIso8601String(),
            ]);

        $approvedCount = $plans->where('status', DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED)->count();
        $pendingCount  = $plans->where('status', DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED)->count();
        $returnedCount = $plans->where('status', DevelopmentPlan::STATUS_RETURNED)->count();

        return Inertia::render('DeptHead/Idp/OfficeIdp', [
            'plans'         => $plans,
            'approvedCount' => $approvedCount,
            'pendingCount'  => $pendingCount,
            'returnedCount' => $returnedCount,
            'office'        => $office ? [
                'id'           => $office->id,
                'name'         => $office->name,
                'office_score' => $opcr ? round((float) $opcr->final_office_rating, 2) : null,
                'office_rating'=> $opcr?->final_adjectival_rating ?? null,
                'period_name'  => $opcr?->period?->name ?? null,
            ] : null,
        ]);
    }

    public function show(DevelopmentPlan $idp)
    {
        abort_unless($idp->dept_head_id === auth()->id(), 403);
        $idp->load(['employee.office', 'performancePeriod:id,name']);

        return Inertia::render('DeptHead/Idp/Show', [
            'plan' => [
                'id'                   => $idp->id,
                'status'               => $idp->status,
                'source_score'         => $idp->source_score ? round((float) $idp->source_score, 2) : null,
                'source_rating'        => $idp->source_rating,
                'pmt_remarks'          => $idp->pmt_remarks,
                'supervisor_remarks'   => $idp->supervisor_remarks,
                'dept_head_remarks'    => $idp->dept_head_remarks,
                'idp_rows'             => $idp->idp_rows ?? [],
                'period'               => $idp->performancePeriod?->name,
                'prepared_by_name'     => $idp->prepared_by_name,
                'recommended_by_name'  => $idp->recommended_by_name,
                'dept_head_action_at'  => $idp->dept_head_action_at?->format('M d, Y'),
                'updated_at'           => $idp->updated_at?->format('M d, Y g:i A'),
            ],
            'employee' => [
                'name'     => $idp->employee?->name ?? '—',
                'position' => $idp->employee?->position ?? '—',
                'office'   => $idp->employee?->office?->name ?? '—',
                'avatar'   => $idp->employee?->profile_photo_url,
            ],
        ]);
    }

    public function approve(Request $request, DevelopmentPlan $idp)
    {
        abort_unless($idp->dept_head_id === auth()->id(), 403);
        abort_if(in_array($idp->status, self::LOCKED), 403, 'Already actioned.');

        $idp->update([
            'status'              => DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
            'dept_head_remarks'   => $request->input('remarks'),
            'dept_head_action_at' => now(),
            'approved_by_name'    => auth()->user()->name,
            'updated_by'          => auth()->id(),
        ]);

        $idp->employee?->notify(new WorkflowEventNotification(
            type: 'success',
            event: 'development_plan.dept_head_approved',
            message: 'Your Individual Development Plan has been approved by the Department Head.',
            url: '/employee/idp',
        ));

        return back()->with('success', 'IDP approved.');
    }

    public function return(Request $request, DevelopmentPlan $idp)
    {
        abort_unless($idp->dept_head_id === auth()->id(), 403);
        abort_if(in_array($idp->status, self::LOCKED), 403, 'Already actioned.');

        $data = $request->validate(['remarks' => ['required', 'string', 'max:2000']]);

        $idp->update([
            'status'              => DevelopmentPlan::STATUS_RETURNED,
            'dept_head_remarks'   => $data['remarks'],
            'dept_head_action_at' => now(),
            'updated_by'          => auth()->id(),
        ]);

        $idp->employee?->notify(new WorkflowEventNotification(
            type: 'warning',
            event: 'development_plan.returned_by_dept_head',
            message: 'Your IDP was returned by the Department Head. Please review the remarks and resubmit.',
            url: '/employee/idp',
        ));

        return back()->with('success', 'IDP returned to employee.');
    }

    public function submitToPmt(Request $request)
    {
        $deptHead = auth()->user();

        // Get all low-performer IDPs under this dept head
        $allPlans = DevelopmentPlan::where('dept_head_id', $deptHead->id)
            ->with(['employee.office', 'supervisor'])
            ->get();

        // Check for blockers: employees with non-approved status
        $blockers = $allPlans->filter(fn ($p) => !in_array($p->status, [
            DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
            DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
            DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
        ]));

        if ($blockers->isNotEmpty()) {
            $items = $blockers->map(fn ($p) => [
                'employee_id'   => $p->employee_id,
                'employee_name' => $p->employee?->name ?? '—',
                'position'      => $p->employee?->position ?? '—',
                'avatar'        => $p->employee?->profile_photo_url,
                'status'        => $p->status,
                'supervisor_id' => $p->supervisor_id,
            ])->values()->all();

            return back()->with('validation_blockers', $items);
        }

        // Batch submit all dept_head_approved IDPs to PMT
        $toSubmit = $allPlans->where('status', DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED);

        if ($toSubmit->isEmpty()) {
            return back()->with('error', 'No approved IDPs to submit to PMT.');
        }

        foreach ($toSubmit as $plan) {
            $plan->update([
                'status'     => DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                'updated_by' => auth()->id(),
            ]);
        }

        return back()->with('success', "Submitted {$toSubmit->count()} IDP(s) to PMT.");
    }
}
