<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Concerns\FormatsAssignedEmployees;
use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\Opcr;
use App\Notifications\WorkflowEventNotification;
use App\Services\AssignmentAi\AssignmentPredictorInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OpcrController extends Controller
{
    use FormatsAssignedEmployees;

    public function __construct(private readonly AssignmentPredictorInterface $assignmentPredictor) {}

    public function index()
    {
        $opcrs = Opcr::with(['office', 'period', 'uwps'])
            ->whereIn('status', ['submitted', 'approved', 'returned'])
            ->latest()
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'office' => $o->office?->name ?? '—',
                'period' => $o->period?->name ?? '—',
                'status' => $o->status,
                'uwp_count' => $o->uwps->count(),
                'approved_count' => $o->uwps->where('status', 'approved')->count(),
                'updated_at' => $o->updated_at?->format('M d, Y'),
            ]);

        return Inertia::render('Pmt/OpcrReview/Index', ['opcrs' => $opcrs]);
    }

    public function show(int $id)
    {
        $opcr = Opcr::with([
            'office', 'period',
            'uwps.creator',
            'uwps.uwpFunctions.mfos.successIndicators.qetStandards',
            'uwps.uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->whereIn('status', ['submitted', 'approved', 'returned'])->findOrFail($id);

        $functions = [];
        foreach ($opcr->uwps as $uwp) {
            foreach ($uwp->uwpFunctions as $fn) {
                $key = $fn->function_type.'::'.$fn->name;
                if (! isset($functions[$key])) {
                    $functions[$key] = ['id' => $fn->id, 'name' => $fn->name, 'function_type' => $fn->function_type, 'weight_percent' => $fn->weight_percent, 'mfos' => []];
                }
                foreach ($fn->mfos as $mfo) {
                    if (! isset($functions[$key]['mfos'][$mfo->title])) {
                        $functions[$key]['mfos'][$mfo->title] = ['id' => $mfo->id, 'title' => $mfo->title, 'successIndicators' => []];
                    }
                    foreach ($mfo->successIndicators as $si) {
                        $functions[$key]['mfos'][$mfo->title]['successIndicators'][] = [
                            'id' => $si->id,
                            'indicator_text' => $si->indicator_text,
                            'target_quantity' => $si->target_quantity,
                            'target_timeline' => $si->target_timeline,
                            'supervisor' => $uwp->creator?->name,
                            'assignments' => $si->assignments->map(fn ($a) => [
                                'employee' => $this->formatAssignedEmployee($a->employee, $si->id),
                            ])->values(),
                            'qetStandards' => $si->qetStandards->map(fn ($q) => [
                                'id' => $q->id, 'dimension' => $q->dimension, 'rating' => $q->rating, 'standard_text' => $q->standard_text,
                            ])->values(),
                        ];
                    }
                }
            }
        }

        $fnList = array_values(array_map(fn ($fn) => [
            ...$fn,
            'mfos' => array_values(array_map(fn ($mfo) => [...$mfo, 'successIndicators' => array_values($mfo['successIndicators'])], $fn['mfos'])),
        ], $functions));

        return Inertia::render('Pmt/OpcrReview/Show', [
            'opcr' => [
                'id' => $opcr->id,
                'office' => $opcr->office?->name ?? '—',
                'period' => $opcr->period?->name ?? '—',
                'status' => $opcr->status,
                'return_remarks' => $opcr->return_remarks,
            ],
            'uwps' => $opcr->uwps->map(fn ($u) => [
                'id' => $u->id,
                'supervisor' => $u->creator?->name ?? '—',
                'supervisor_avatar' => $u->creator?->profile_photo_url,
                'status' => $u->status,
                'mfo_labels' => $u->uwpFunctions->flatMap(fn ($f) => $f->mfos->pluck('title'))->take(3)->implode(' · '),
            ]),
            'functions' => $fnList,
        ]);
    }

    public function approve(int $id)
    {
        $opcr = Opcr::with([
            'uwps.uwpFunctions.mfos.successIndicators.assignments',
        ])->where('status', 'submitted')->findOrFail($id);

        $opcr->update(['status' => 'approved']);

        $periodId = $opcr->performance_period_id;
        $employeeIndicators = [];
        foreach ($opcr->uwps as $uwp) {
            foreach ($uwp->uwpFunctions as $fn) {
                foreach ($fn->mfos as $mfo) {
                    foreach ($mfo->successIndicators as $si) {
                        foreach ($si->assignments as $assignment) {
                            $employeeIndicators[$assignment->employee_id][] = $si->id;
                        }
                    }
                }
            }
        }

        foreach ($employeeIndicators as $employeeId => $indicatorIds) {
            $ipcr = Ipcr::firstOrCreate(
                ['employee_id' => $employeeId, 'performance_period_id' => $periodId],
                ['opcr_id' => $opcr->id, 'status' => 'draft']
            );
            $ipcr->indicators()->syncWithoutDetaching($indicatorIds);

            // Notify the employee their IPCR targets are ready
            $employee = \App\Models\User::find($employeeId);
            $employee?->notify(new WorkflowEventNotification(
                type: 'success',
                event: 'ipcr.ready_for_commitment',
                message: 'Your IPCR targets are now ready. You can view and commit to your performance targets.',
                url: '/employee/ipcr-target',
            ));
        }

        // Notify the dept-head of this office
        $deptHead = \App\Models\User::where('office_id', $opcr->office_id)
            ->where('role', 'dept-head')->first();
        $deptHead?->notify(new WorkflowEventNotification(
            type: 'success',
            event: 'opcr.approved',
            message: 'Your OPCR has been approved by PMT. IPCRs have been generated for assigned employees.',
            url: '/dept-head/opcr/' . $opcr->id,
        ));

        return back()->with('success', 'OPCR approved. IPCRs generated for assigned employees.');
    }

    public function returnOpcr(Request $request, int $id)
    {
        $request->validate(['remarks' => 'required|string|max:1000']);
        $opcr = Opcr::with('uwps')->whereIn('status', ['submitted', 'approved'])->findOrFail($id);

        $opcr->update([
            'status' => 'returned',
            'return_remarks' => $request->remarks,
            'returned_by' => Auth::id(),
        ]);

        $opcr->uwps()->update([
            'status' => 'returned',
            'return_remarks' => 'OPCR returned by PMT: ' . $request->remarks,
            'returned_by' => Auth::id(),
        ]);

        $deptHead = \App\Models\User::where('office_id', $opcr->office_id)
            ->where('role', 'dept-head')->first();
        $deptHead?->notify(new WorkflowEventNotification(
            type: 'alert',
            event: 'opcr.returned',
            message: 'Your OPCR was returned by PMT for revision. Remarks: ' . $request->remarks,
            url: '/dept-head/opcr/' . $opcr->id,
        ));

        return back()->with('success', 'OPCR returned to dept. head.');
    }
}
