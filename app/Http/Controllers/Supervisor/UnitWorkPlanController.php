<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\UnitWorkPlan;
use App\Models\User;
use App\Models\PerformancePeriod;
use Illuminate\Support\Facades\Auth;

class UnitWorkPlanController extends Controller
{
    public function index()
    {
        $user   = Auth::user();
        $period = PerformancePeriod::current();

        $uwps = UnitWorkPlan::with(['performancePeriod', 'office'])
            ->where('office_id', $user->office_id)
            ->latest()
            ->get()
            ->map(fn($u) => [
                'id'         => $u->id,
                'period'     => $u->performancePeriod?->name ?? '—',
                'office'     => $u->office?->name ?? '—',
                'status'     => $u->status,
                'updated_at' => $u->updated_at?->format('M d, Y'),
            ]);

        return \Inertia\Inertia::render('Supervisor/UnitWorkPlan/Index', [
            'uwps'          => $uwps,
            'activePeriod'  => $period?->name ?? 'No active period',
            'activePeriodId'=> $period?->id,
        ]);
    }

    public function show(int $id)
    {
        $user = Auth::user();

        $uwp = UnitWorkPlan::with([
            'performancePeriod',
            'office',
            'uwpFunctions.mfos.successIndicators.qetStandards',
            'uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->where('office_id', $user->office_id)->findOrFail($id);

        return \Inertia\Inertia::render('Supervisor/UnitWorkPlan/Show', [
            'uwp' => [
                'id'             => $uwp->id,
                'period'         => $uwp->performancePeriod?->name ?? '—',
                'office'         => $uwp->office?->name ?? '—',
                'status'         => $uwp->status,
                'return_remarks' => $uwp->return_remarks,
            ],
            'functions' => $uwp->uwpFunctions->map(fn($fn) => [
                'id'            => $fn->id,
                'name'          => $fn->name,
                'function_type' => $fn->function_type,
                'mfos'          => $fn->mfos->map(fn($mfo) => [
                    'id'    => $mfo->id,
                    'title' => $mfo->title,
                    'successIndicators' => $mfo->successIndicators->map(fn($si) => [
                        'id'             => $si->id,
                        'indicator_text' => $si->indicator_text,
                        'target_quantity'=> $si->target_quantity,
                        'target_timeline'=> $si->target_timeline,
                        'allotted_budget'=> $si->allotted_budget,
                        'qetStandards'   => $si->qetStandards->map(fn($q) => [
                            'id'            => $q->id,
                            'dimension'     => $q->dimension,
                            'rating'        => $q->rating,
                            'standard_text' => $q->standard_text,
                        ]),
                        'assignments' => $si->assignments->map(fn($a) => [
                            'employee' => ['id' => $a->employee?->id, 'name' => $a->employee?->name],
                        ]),
                    ]),
                ]),
            ]),
        ]);
    }

    public function store()
    {
        return redirect()->route('supervisor.uwp.editor', 0);
    }

    public function editor(int $id)
    {
        // Prototype mode — no DB
        if ($id === 0) {
            return \Inertia\Inertia::render('Supervisor/UnitWorkPlan/Editor', [
                'uwp' => [
                    'id'       => 0,
                    'period'   => PerformancePeriod::current()?->name ?? 'FY 2026',
                    'office'   => Auth::user()->office?->name ?? 'Your Office',
                    'status'   => 'draft',
                    'editable' => true,
                ],
                'functions' => [],
                'employees' => [],
            ]);
        }
        $user = Auth::user();

        $uwp = UnitWorkPlan::with([
            'performancePeriod',
            'office',
            'uwpFunctions.mfos.successIndicators.qetStandards',
            'uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->where('office_id', $user->office_id)->findOrFail($id);

        $employees = User::where('office_id', $user->office_id)
            ->where('role', 'employee')
            ->select('id', 'name', 'position')
            ->get();

        return \Inertia\Inertia::render('Supervisor/UnitWorkPlan/Editor', [
            'uwp'       => [
                'id'     => $uwp->id,
                'period' => $uwp->performancePeriod?->name ?? '—',
                'office' => $uwp->office?->name ?? '—',
                'status' => $uwp->status,
                'editable' => $uwp->isEditableBySupervisor(),
            ],
            'functions' => $uwp->uwpFunctions->map(fn($fn) => [
                'id'             => $fn->id,
                'name'           => $fn->name,
                'function_type'  => $fn->function_type,
                'weight_percent' => $fn->weight_percent,
                'mfos'           => $fn->mfos->map(fn($mfo) => [
                    'id'               => $mfo->id,
                    'title'            => $mfo->title,
                    'target_quantity'  => $mfo->target_quantity,
                    'target_timeline'  => $mfo->target_timeline,
                    'weight_percent'   => $mfo->weight_percent,
                    'successIndicators'=> $mfo->successIndicators->map(fn($si) => [
                        'id'               => $si->id,
                        'indicator_text'   => $si->indicator_text,
                        'target_quantity'  => $si->target_quantity,
                        'target_timeline'  => $si->target_timeline,
                        'allotted_budget'  => $si->allotted_budget,
                        'qetStandards'     => $si->qetStandards->map(fn($q) => [
                            'id'            => $q->id,
                            'dimension'     => $q->dimension,
                            'rating'        => $q->rating,
                            'standard_text' => $q->standard_text,
                        ]),
                        'assignments' => $si->assignments->map(fn($a) => [
                            'employee_id' => $a->employee_id,
                            'employee'    => ['id' => $a->employee?->id, 'name' => $a->employee?->name, 'position' => $a->employee?->position],
                        ]),
                    ]),
                ]),
            ]),
            'employees' => $employees,
        ]);
    }
}
