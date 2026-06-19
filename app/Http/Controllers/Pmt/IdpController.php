<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Notifications\WorkflowEventNotification;
use App\Services\LndHandoffService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

class IdpController extends Controller
{
    public function index(Request $request)
    {
        $search = trim($request->get('search', ''));
        $status = $request->get('status', '');

        $query = DevelopmentPlan::with(['employee.office', 'performancePeriod:id,name'])
            ->whereNotNull('employee_id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($search !== '') {
            $query->whereHas('employee', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('position', 'like', "%{$search}%")
            );
        }

        $plans = $query->orderByRaw("FIELD(status, 'approved', 'supervisor_recommended', 'submitted', 'returned', 'pending_details', 'draft', 'submitted_to_ld')")
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

        $counts = [
            'all'                    => $plans->count(),
            'approved'               => $plans->where('status', 'approved')->count(),
            'supervisor_recommended' => $plans->where('status', 'supervisor_recommended')->count(),
            'submitted'              => $plans->where('status', 'submitted')->count(),
            'pending_details'        => $plans->where('status', 'pending_details')->count(),
            'submitted_to_ld'        => $plans->where('status', 'submitted_to_ld')->count(),
        ];

        return Inertia::render('Pmt/Idp/Index', [
            'plans'   => $plans,
            'counts'  => $counts,
            'search'  => $search,
            'status'  => $status,
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
            ->where('status', DevelopmentPlan::STATUS_APPROVED)
            ->where('lnd_sync_status', DevelopmentPlan::LND_SYNC_NOT_SENT)
            ->with('employee')
            ->get();

        if ($plans->isEmpty()) {
            return back()->with('error', 'No approved IDPs found to submit.');
        }

        $success = 0;
        $failed  = 0;

        foreach ($plans as $plan) {
            try {
                $result = $lnd->sendDevelopmentPlan($plan);
                $plan->update([
                    'status'            => DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
                    'submitted_to_ld_at'=> now(),
                    'lnd_sync_status'   => ($result['status'] ?? 'sent') === 'acknowledged'
                        ? DevelopmentPlan::LND_SYNC_ACKNOWLEDGED : DevelopmentPlan::LND_SYNC_SENT,
                    'lnd_reference_id'  => $result['lnd_reference_id'] ?? null,
                    'lnd_synced_at'     => now(),
                    'lnd_last_error'    => null,
                    'updated_by'        => auth()->id(),
                ]);
                $plan->employee?->notify(new WorkflowEventNotification(
                    type: 'info',
                    event: 'development_plan.submitted_to_ld',
                    message: 'Your Individual Development Plan has been submitted to the Learning & Development Section.',
                    url: '/employee/idp',
                ));
                $success++;
            } catch (RuntimeException $e) {
                $plan->update(['lnd_sync_status' => DevelopmentPlan::LND_SYNC_FAILED, 'lnd_last_error' => $e->getMessage()]);
                $failed++;
            }
        }

        $msg = "Submitted {$success} IDP(s) to L&D.";
        if ($failed) $msg .= " {$failed} failed.";

        return back()->with($failed ? 'error' : 'success', $msg);
    }
}
