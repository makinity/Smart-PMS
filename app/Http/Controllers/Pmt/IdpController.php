<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Models\OpcraAccomplishmentSubmission;
use App\Notifications\WorkflowEventNotification;
use App\Services\LndHandoffService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

class IdpController extends Controller
{
    public function index()
    {
        // Get all offices that have IDPs in submitted_to_pmt or later stages
        $plans = DevelopmentPlan::with(['employee.office', 'office', 'performancePeriod:id,name'])
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->whereNotNull('office_id')
            ->get();

        // Group by office
        $offices = $plans->groupBy('office_id')->map(function ($officePlans, $officeId) {
            $first = $officePlans->first();
            $office = $first->office;

            // Get office OPCR score for the period if available
            $periodId = $first->performance_period_id;
            $opcr = \App\Models\OpcraAccomplishmentSubmission::where('office_id', $officeId)
                ->where('performance_period_id', $periodId)
                ->whereNotNull('final_office_rating')
                ->first();

            return [
                'office_id'        => (int) $officeId,
                'office_name'      => $office?->name ?? '—',
                'period_name'      => $first->performancePeriod?->name ?? '—',
                'period_id'        => $periodId,
                'office_score'     => $opcr ? round((float) $opcr->final_office_rating, 2) : null,
                'office_rating'    => $opcr?->final_adjectival_rating ?? null,
                'total'          => $officePlans->count(),
                'submitted_to_pmt' => $officePlans->where('status', DevelopmentPlan::STATUS_SUBMITTED_TO_PMT)->count(),
                'submitted_to_ld'  => $officePlans->where('status', DevelopmentPlan::STATUS_SUBMITTED_TO_LD)->count(),
            ];
        })->values();

        return Inertia::render('Pmt/Idp/Index', [
            'offices' => $offices,
        ]);
    }

    public function officeShow(int $officeId)
    {
        $plans = DevelopmentPlan::where('office_id', $officeId)
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->with(['employee.office', 'performancePeriod:id,name'])
            ->orderByRaw("FIELD(status, 'submitted_to_pmt', 'submitted_to_ld')")
            ->orderByDesc('updated_at')
            ->get();

        if ($plans->isEmpty()) {
            abort(404);
        }

        $first = $plans->first();
        $office = $first->office;

        $periodId = $first->performance_period_id;
        $opcr = OpcraAccomplishmentSubmission::where('office_id', $officeId)
            ->where('performance_period_id', $periodId)
            ->whereNotNull('final_office_rating')
            ->first();

        $mappedPlans = $plans->map(fn ($p) => [
            'id'              => $p->id,
            'status'          => $p->status,
            'employee_name'   => $p->employee?->name ?? '—',
            'employee_avatar' => $p->employee?->profile_photo_url,
            'position'        => $p->employee?->position ?? '—',
            'source_score'    => $p->source_score ? round((float) $p->source_score, 2) : null,
            'source_rating'   => $p->source_rating,
            'period'          => $p->performancePeriod?->name ?? '—',
            'pmt_remarks'     => $p->pmt_remarks ?? '',
            'updated_at'      => $p->updated_at?->toIso8601String(),
        ]);

        return Inertia::render('Pmt/Idp/OfficeShow', [
            'office' => [
                'id'           => (int) $officeId,
                'name'         => $office?->name ?? '—',
                'period_name'  => $first->performancePeriod?->name ?? '—',
                'office_score' => $opcr ? round((float) $opcr->final_office_rating, 2) : null,
                'office_rating'=> $opcr?->final_adjectival_rating ?? null,
            ],
            'plans'  => $mappedPlans,
        ]);
    }

    public function show(DevelopmentPlan $idp)
    {
        $idp->load(['employee.office', 'performancePeriod:id,name']);

        return Inertia::render('Pmt/Idp/Show', [
            'plan' => [
                'id'                  => $idp->id,
                'status'              => $idp->status,
                'source_score'        => $idp->source_score ? round((float) $idp->source_score, 2) : null,
                'source_rating'       => $idp->source_rating,
                'pmt_remarks'         => $idp->pmt_remarks ?? '',
                'supervisor_remarks'  => $idp->supervisor_remarks ?? '',
                'dept_head_remarks'   => $idp->dept_head_remarks ?? '',
                'idp_rows'            => $idp->idp_rows ?? [],
                'period'              => $idp->performancePeriod?->name,
                'lnd_sync_status'     => $idp->lnd_sync_status,
                'submitted_to_ld_at'  => $idp->submitted_to_ld_at?->format('M d, Y'),
                'updated_at'          => $idp->updated_at?->format('M d, Y g:i A'),
                'office_id'           => $idp->office_id,
            ],
            'employee' => [
                'name'     => $idp->employee?->name ?? '—',
                'position' => $idp->employee?->position ?? '—',
                'office'   => $idp->employee?->office?->name ?? '—',
                'avatar'   => $idp->employee?->profile_photo_url,
            ],
        ]);
    }

    public function savePmtRemarks(Request $request, DevelopmentPlan $idp)
    {
        $data = $request->validate(['pmt_remarks' => ['nullable', 'string', 'max:2000']]);
        $idp->update(['pmt_remarks' => $data['pmt_remarks'], 'updated_by' => auth()->id()]);
        return back()->with('success', 'Remarks saved.');
    }

    public function bulkSubmitToLd(Request $request, LndHandoffService $lnd)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        $plans = DevelopmentPlan::whereIn('id', $ids)
            ->where('status', DevelopmentPlan::STATUS_SUBMITTED_TO_PMT)
            ->with('employee')
            ->get();

        if ($plans->isEmpty()) {
            return back()->with('error', 'No submitted IDPs found to submit to L&D.');
        }

        $success = 0;
        $failed  = 0;
        $successfulOfficeIds = []; // track office IDs of successfully submitted plans

        foreach ($plans as $plan) {
            try {
                $result = $lnd->sendDevelopmentPlan($plan);
                $plan->update([
                    'status'             => DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
                    'submitted_to_ld_at' => now(),
                    'lnd_sync_status'    => ($result['status'] ?? 'sent') === 'acknowledged'
                        ? DevelopmentPlan::LND_SYNC_ACKNOWLEDGED : DevelopmentPlan::LND_SYNC_SENT,
                    'lnd_reference_id'   => $result['lnd_reference_id'] ?? null,
                    'lnd_synced_at'      => now(),
                    'lnd_last_error'     => null,
                    'updated_by'         => auth()->id(),
                ]);

                // Notify the employee
                $plan->employee?->notify(new WorkflowEventNotification(
                    type: 'info',
                    event: 'development_plan.submitted_to_ld',
                    message: 'Your Individual Development Plan has been submitted to the Learning & Development Section.',
                    url: '/employee/idp',
                ));

                if ($plan->office_id) {
                    $successfulOfficeIds[$plan->office_id] = ($successfulOfficeIds[$plan->office_id] ?? 0) + 1;
                }

                $success++;
            } catch (RuntimeException $e) {
                $plan->update(['lnd_sync_status' => DevelopmentPlan::LND_SYNC_FAILED, 'lnd_last_error' => $e->getMessage()]);
                $failed++;
            }
        }

        // Send one summary notification per dept-head office
        foreach ($successfulOfficeIds as $officeId => $count) {
            $deptHead = \App\Models\User::where('office_id', $officeId)
                ->where('role', 'dept-head')
                ->first();
            $deptHead?->notify(new WorkflowEventNotification(
                type: 'info',
                event: 'development_plan.submitted_to_ld_dh',
                message: "{$count} IDP(s) from your office have been submitted to the Learning & Development Section.",
                url: '/dept-head/idp',
            ));
        }

        $msg = "Submitted {$success} IDP(s) to L&D.";
        if ($failed) $msg .= " {$failed} failed.";

        return back()->with($failed ? 'error' : 'success', $msg);
    }
}
