<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\PerformancePeriod;
use App\Notifications\WorkflowEventNotification;
use App\Services\LndHandoffService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

class IdpController extends Controller
{
    public function index(Request $request)
    {
        $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();
        $periodId = $request->get('period_id');
        $period = $periodId
            ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current()
            : PerformancePeriod::current();

        // Get all offices that have IDPs in submitted_to_pmt or later stages
        $plans = DevelopmentPlan::with(['employee.employee.office', 'office', 'performancePeriod:id,name'])
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->whereNotNull('office_id')
            ->where('performance_period_id', $period->id)
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
            'allPeriods' => $allPeriods->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_active' => $p->is_active])->values(),
            'period' => $period ? ['id' => $period->id, 'name' => $period->name, 'is_active' => $period->is_active] : null,
        ]);
    }

    public function officeShow(Request $request, int $officeId)
    {
        $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();
        $periodId = $request->get('period_id');
        $period = $periodId
            ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current()
            : PerformancePeriod::current();
        $isPastPeriod = $period && !$period->is_active;

        $plans = DevelopmentPlan::where('office_id', $officeId)
            ->whereIn('status', [
                DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
                DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
            ])
            ->when($period, fn ($q) => $q->where('performance_period_id', $period->id))
            ->with(['employee.employee.office', 'performancePeriod:id,name'])
            ->orderByRaw("FIELD(status, 'submitted_to_pmt', 'submitted_to_ld')")
            ->orderByDesc('updated_at')
            ->get();

        if ($plans->isEmpty() && !$periodId) {
            abort(404);
        }

        $first = $plans->first();
        $office = $first?->office ?? \App\Models\Office::find($officeId);
        $periodId = $first?->performance_period_id ?? $period?->id;
        $opcr = $periodId ? OpcraAccomplishmentSubmission::where('office_id', $officeId)
            ->where('performance_period_id', $periodId)
            ->whereNotNull('final_office_rating')
            ->first() : null;

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
            'lnd_sync_status' => $p->lnd_sync_status,
            'lnd_last_error'  => $p->lnd_last_error ?? null,
            'updated_at'      => $p->updated_at?->toIso8601String(),
        ]);

        return Inertia::render('Pmt/Idp/OfficeShow', [
            'office' => [
                'id'           => (int) $officeId,
                'name'         => $office?->name ?? '—',
                'period_name'  => $period?->name ?? $first?->performancePeriod?->name ?? '—',
                'office_score' => $opcr ? round((float) $opcr->final_office_rating, 2) : null,
                'office_rating'=> $opcr?->final_adjectival_rating ?? null,
            ],
            'plans'      => $mappedPlans,
            'period'     => $period ? ['id' => $period->id, 'name' => $period->name, 'is_active' => $period->is_active] : null,
            'allPeriods' => $allPeriods->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_active' => $p->is_active])->values(),
        ]);
    }

    public function show(DevelopmentPlan $idp)
    {
        $idp->load(['employee.employee.office', 'performancePeriod:id,name']);

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
                'lnd_last_error'      => $idp->lnd_last_error ?? null,
                'lnd_reference_id'    => $idp->lnd_reference_id ?? null,
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

    /**
     * Revert a "submitted_to_ld" plan back to "submitted_to_pmt".
     *
     * This is a safety escape-hatch for when:
     *  - L&D rejected or lost the referral
     *  - The wrong employee was submitted
     *  - The sync failed and needs to be retried cleanly
     *
     * It clears all L&D tracking fields and unlocks the employee's PMS account
     * so they can log in again.
     */
    public function revertLdSubmission(Request $request, DevelopmentPlan $idp)
    {
        if ($idp->status !== DevelopmentPlan::STATUS_SUBMITTED_TO_LD) {
            return back()->with('error', 'This IDP is not in the Submitted to L&D state and cannot be reverted.');
        }

        // Roll back plan to previous step
        $idp->update([
            'status'             => DevelopmentPlan::STATUS_SUBMITTED_TO_PMT,
            'submitted_to_ld_at' => null,
            'lnd_sync_status'    => DevelopmentPlan::LND_SYNC_NOT_SENT,
            'lnd_reference_id'   => null,
            'lnd_synced_at'      => null,
            'lnd_last_error'     => null,
            'updated_by'         => auth()->id(),
        ]);

        // Unlock the employee so they can log back into PMS
        $idp->employee?->employee?->update([
            'training_locked'  => false,
            'lnd_reference_id' => null,
        ]);

        // Notify the employee that they can log in again
        if ($idp->employee) {
            $idp->employee->notify(new \App\Notifications\WorkflowEventNotification(
                type: 'warning',
                event: 'development_plan.ld_submission_reverted',
                message: 'Your L&D referral has been recalled by PMT. You can now log back into PMS. Please wait for further instructions.',
                url: '/employee/idp',
            ));
        }

        \Illuminate\Support\Facades\Log::info('[PMT] L&D submission reverted', [
            'plan_id'     => $idp->id,
            'employee_id' => $idp->employee_id,
            'reverted_by' => auth()->id(),
        ]);

        return back()->with('success', 'L&D submission reverted. Employee account has been unlocked.');
    }

    public function bulkSubmitToLd(Request $request, LndHandoffService $lnd)
    {
        $ids = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']])['ids'];

        $plans = DevelopmentPlan::whereIn('id', $ids)
            ->where('status', DevelopmentPlan::STATUS_SUBMITTED_TO_PMT)
            ->with('employee.employee')
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

                // Lock employee out of PMS — they will be redirected to L&D on next login
                $plan->employee?->employee?->update([
                    'training_locked'  => true,
                    'lnd_reference_id' => $result['lnd_reference_id'] ?? null,
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
            $deptHead = \App\Models\User::whereHas('employee', fn ($q) => $q->where('office_id', $officeId))
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
