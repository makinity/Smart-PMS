<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Concerns\FormatsAssignedEmployees;
use App\Http\Controllers\Controller;
use App\Models\Opcr;
use App\Models\PerformancePeriod;
use App\Models\UnitWorkPlan;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use App\Services\AssignmentAi\AssignmentPredictorInterface;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OpcrController extends Controller
{
    use FormatsAssignedEmployees;

    public function __construct(private readonly AssignmentPredictorInterface $assignmentPredictor) {}

    public function index()
    {
        $user = Auth::user();
        $period = PerformancePeriod::where('is_active', true)->first();

        // Fetch all approved UWPs for this office grouped by period
        $uwps = UnitWorkPlan::with(['performancePeriod', 'creator'])
            ->where('office_id', $user->office_id)
            ->whereIn('status', ['approved'])
            ->latest()
            ->get();

        // Get or describe OPCRs for this office
        $opcrs = Opcr::with(['period', 'uwps'])
            ->where('office_id', $user->office_id)
            ->latest()
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'period' => $o->period?->name ?? '—',
                'status' => $o->status,
                'uwp_count' => $o->uwps->count(),
                'approved_count' => $o->uwps->where('status', 'approved')->count(),
                'updated_at' => $o->updated_at?->format('M d, Y'),
            ]);

        return Inertia::render('DeptHead/Opcr/Index', [
            'opcrs' => $opcrs,
            'activePeriod' => $period?->name ?? 'No active period',
        ]);
    }

    public function show(int $id)
    {
        $user = Auth::user();

        $opcr = Opcr::with([
            'period',
            'uwps.creator',
            'uwps.uwpFunctions.mfos.successIndicators.qetStandards',
            'uwps.uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->where('office_id', $user->office_id)->findOrFail($id);

        // Collect all functions across all UWPs, grouped by function_type + name
        $functions = [];
        foreach ($opcr->uwps as $uwp) {
            foreach ($uwp->uwpFunctions as $fn) {
                $key = $fn->function_type.'::'.$fn->name;
                if (! isset($functions[$key])) {
                    $functions[$key] = [
                        'id' => $fn->id,
                        'name' => $fn->name,
                        'function_type' => $fn->function_type,
                        'weight_percent' => $fn->weight_percent,
                        'mfos' => [],
                    ];
                }
                foreach ($fn->mfos as $mfo) {
                    $mfoKey = $mfo->title;
                    if (! isset($functions[$key]['mfos'][$mfoKey])) {
                        $functions[$key]['mfos'][$mfoKey] = [
                            'id' => $mfo->id,
                            'title' => $mfo->title,
                            'successIndicators' => [],
                        ];
                    }
                    foreach ($mfo->successIndicators as $si) {
                        $functions[$key]['mfos'][$mfoKey]['successIndicators'][] = [
                            'id' => $si->id,
                            'indicator_text' => $si->indicator_text,
                            'target_quantity' => $si->target_quantity,
                            'target_timeline' => $si->target_timeline,
                            'supervisor' => $uwp->creator?->name,
                            'assignments' => $si->assignments->map(fn ($a) => [
                                'employee' => $this->formatAssignedEmployee($a->employee, $si->id),
                            ])->values(),
                            'qetStandards' => $si->qetStandards->map(fn ($q) => [
                                'id' => $q->id,
                                'dimension' => $q->dimension,
                                'rating' => $q->rating,
                                'standard_text' => $q->standard_text,
                            ])->values(),
                        ];
                    }
                }
            }
        }

        // Re-index mfos arrays
        $fnList = array_values(array_map(fn ($fn) => [
            ...$fn,
            'mfos' => array_values(array_map(fn ($mfo) => [
                ...$mfo,
                'successIndicators' => array_values($mfo['successIndicators']),
            ], $fn['mfos'])),
        ], $functions));

        return Inertia::render('DeptHead/Opcr/Show', [
            'opcr' => [
                'id' => $opcr->id,
                'period' => $opcr->period?->name ?? '—',
                'office' => $user->office?->name ?? '—',
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

    public function submit(int $id)
    {
        $opcr = Opcr::where('office_id', Auth::user()->office_id)
            ->where('status', 'draft')
            ->findOrFail($id);
        $opcr->update(['status' => 'submitted']);

        $sender = Auth::user();
        User::where('role', 'pmt')->each(fn ($pmt) =>
            $pmt->notify(new WorkflowEventNotification(
                type: 'info',
                event: 'opcr.submitted',
                message: $sender->name . ' submitted an OPCR for PMT review.',
                url: '/pmt/opcr-review/' . $opcr->id,
            ))
        );

        return back()->with('success', 'OPCR submitted to PMT.');
    }
}
