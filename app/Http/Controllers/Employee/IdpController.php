<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IdpController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $user->load('office:id,name');

        $plan = DevelopmentPlan::where('employee_id', $user->id)
            ->with('performancePeriod:id,name,start_date,end_date')
            ->latest()
            ->first();

        return Inertia::render('Employee/Idp/Index', [
            'employee' => [
                'id'       => $user->id,
                'name'     => $user->name,
                'position' => $user->position ?? '—',
                'office'   => $user->office?->name ?? '—',
                'avatar'   => $user->profile_photo_url,
            ],
            'plan' => $plan ? $this->formatPlan($plan) : null,
        ]);
    }

    public function update(Request $request, DevelopmentPlan $idp)
    {
        abort_unless($idp->employee_id === auth()->id(), 403);
        abort_if(in_array($idp->status, [
            DevelopmentPlan::STATUS_SUBMITTED,
            DevelopmentPlan::STATUS_SUPERVISOR_RECOMMENDED,
            DevelopmentPlan::STATUS_DEPT_HEAD_APPROVED,
            DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
            DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
        ]), 403, 'This IDP has already been submitted.');

        $data = $request->validate([
            'idp_rows'                              => ['array'],
            'idp_rows.*.performance_gap'            => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.developmental_activity'     => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.support_needed'             => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.support_from_supervisor'    => ['nullable', 'string', 'max:1000'],
            'idp_rows.*.expected_completion'        => ['nullable', 'string', 'max:100'],
            'idp_rows.*.results'                    => ['nullable', 'string', 'max:1000'],
        ]);

        $rows = collect($data['idp_rows'] ?? [])
            ->map(fn ($r) => [
                'performance_gap'         => trim((string) ($r['performance_gap'] ?? '')),
                'developmental_activity'  => trim((string) ($r['developmental_activity'] ?? '')),
                'support_needed'          => trim((string) ($r['support_needed'] ?? '')),
                'support_from_supervisor' => trim((string) ($r['support_from_supervisor'] ?? '')),
                'expected_completion'     => trim((string) ($r['expected_completion'] ?? '')),
                'results'                 => trim((string) ($r['results'] ?? '')),
            ])
            ->reject(fn ($r) => collect($r)->every(fn ($v) => $v === ''))
            ->values()
            ->all();

        $idp->update([
            'idp_rows'   => $rows,
            'status'     => DevelopmentPlan::STATUS_PENDING_DETAILS,
            'updated_by' => auth()->id(),
        ]);

        return back()->with('success', 'Draft saved.');
    }

    public function submit(DevelopmentPlan $idp)
    {
        abort_unless($idp->employee_id === auth()->id(), 403);
        abort_unless(in_array($idp->status, [
            DevelopmentPlan::STATUS_DRAFT,
            DevelopmentPlan::STATUS_PENDING_DETAILS,
            DevelopmentPlan::STATUS_RETURNED,
        ]), 403, 'This IDP cannot be submitted at its current status.');

        if (empty($idp->idp_rows)) {
            return back()->with('error', 'Add at least one development goal before submitting.');
        }

        // Pull supervisor_id from the AccomplishmentSubmission
        $supervisorId = \App\Models\AccomplishmentSubmission::where('employee_id', $idp->employee_id)
            ->where('performance_period_id', $idp->performance_period_id)
            ->whereNotNull('supervisor_id')
            ->value('supervisor_id');

        $idp->update([
            'status'           => DevelopmentPlan::STATUS_SUBMITTED,
            'supervisor_id'    => $supervisorId,
            'prepared_by_name' => auth()->user()->name,
            'updated_by'       => auth()->id(),
        ]);

        // Notify supervisor
        if ($supervisorId) {
            $supervisor = \App\Models\User::find($supervisorId);
            $supervisor?->notify(new \App\Notifications\WorkflowEventNotification(
                type: 'info',
                event: 'development_plan.submitted_to_supervisor',
                message: auth()->user()->name . ' has submitted their Individual Development Plan for your review.',
                url: '/supervisor/idp',
            ));
        }

        return back()->with('success', 'IDP submitted successfully.');
    }

    private function formatPlan(DevelopmentPlan $plan): array
    {
        return [
            'id'                  => $plan->id,
            'status'              => $plan->status,
            'source_score'        => $plan->source_score ? round((float) $plan->source_score, 2) : null,
            'source_rating'       => $plan->source_rating,
            'pmt_remarks'         => $plan->pmt_remarks,
            'supervisor_remarks'  => $plan->supervisor_remarks,
            'dept_head_remarks'   => $plan->dept_head_remarks,
            'idp_rows'            => $plan->idp_rows ?? [],
            'period'              => $plan->performancePeriod?->name,
            'submitted_to_ld_at'  => $plan->submitted_to_ld_at?->format('M d, Y'),
            'updated_at'          => $plan->updated_at?->format('M d, Y g:i A'),
        ];
    }
}
