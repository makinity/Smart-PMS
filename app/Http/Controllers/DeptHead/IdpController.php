<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IdpController extends Controller
{
    private const LOCKED = [
        DevelopmentPlan::STATUS_APPROVED,
        DevelopmentPlan::STATUS_RETURNED,
        DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
    ];

    public function index()
    {
        $deptHead = auth()->user();

        $plans = DevelopmentPlan::where('dept_head_id', $deptHead->id)
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
                DevelopmentPlan::STATUS_APPROVED,
                DevelopmentPlan::STATUS_RETURNED,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->with(['employee.office', 'performancePeriod:id,name'])
            ->orderByRaw("FIELD(status, 'supervisor_recommended', 'returned', 'approved', 'submitted_to_ld')")
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn ($p) => [
                'id'              => $p->id,
                'status'          => $p->status,
                'employee_name'   => $p->employee?->name ?? '—',
                'employee_office' => $p->employee?->office?->name ?? '—',
                'employee_avatar' => $p->employee?->profile_photo_url,
                'position'        => $p->employee?->position ?? '—',
                'source_score'    => $p->source_score ? round((float) $p->source_score, 2) : null,
                'source_rating'   => $p->source_rating,
                'period'          => $p->performancePeriod?->name ?? '—',
                'updated_at'      => $p->updated_at?->toIso8601String(),
            ]);

        return Inertia::render('DeptHead/Idp/Index', ['plans' => $plans]);
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
            'status'              => DevelopmentPlan::STATUS_APPROVED,
            'dept_head_remarks'   => $request->input('remarks'),
            'dept_head_action_at' => now(),
            'approved_by_name'    => auth()->user()->name,
            'updated_by'          => auth()->id(),
        ]);

        $idp->employee?->notify(new WorkflowEventNotification(
            type: 'success',
            event: 'development_plan.approved',
            message: 'Your Individual Development Plan has been approved.',
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
}
