<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\Opcr;
use App\Models\UnitWorkPlan;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UnitWorkPlanController extends Controller
{
    public function index()
    {
        $user   = Auth::user();
        $period = PerformancePeriod::where('is_active', true)->first();

        $uwps = UnitWorkPlan::with(['performancePeriod', 'office', 'creator'])
            ->where('office_id', $user->office_id)
            ->whereIn('status', ['submitted', 'approved', 'returned'])
            ->latest()
            ->get()
            ->map(fn($u) => [
                'id'          => $u->id,
                'period'      => $u->performancePeriod?->name ?? '—',
                'office'      => $u->office?->name ?? '—',
                'supervisor'  => $u->creator?->name ?? '—',
                'status'      => $u->status,
                'updated_at'  => $u->updated_at?->format('M d, Y'),
            ]);

        return \Inertia\Inertia::render('DeptHead/UnitWorkPlan/Index', [
            'uwps'         => $uwps,
            'activePeriod' => $period?->name ?? 'No active period',
        ]);
    }

    public function show(int $id)
    {
        $user = Auth::user();

        $uwp = UnitWorkPlan::with([
            'performancePeriod',
            'office',
            'creator',
            'uwpFunctions.mfos.successIndicators.qetStandards',
            'uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->where('office_id', $user->office_id)->findOrFail($id);

        return \Inertia\Inertia::render('DeptHead/UnitWorkPlan/Show', [
            'uwp' => [
                'id'             => $uwp->id,
                'period'         => $uwp->performancePeriod?->name ?? '—',
                'office'         => $uwp->office?->name ?? '—',
                'supervisor'     => $uwp->creator?->name ?? '—',
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
                        'id'              => $si->id,
                        'indicator_text'  => $si->indicator_text,
                        'target_quantity' => $si->target_quantity,
                        'target_timeline' => $si->target_timeline,
                        'allotted_budget' => $si->allotted_budget,
                        'qetStandards'    => $si->qetStandards->map(fn($q) => [
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

    public function approve(int $id)
    {
        $uwp = UnitWorkPlan::where('office_id', Auth::user()->office_id)
            ->where('status', 'submitted')
            ->findOrFail($id);

        $uwp->update(['status' => 'approved']);

        // Get or create a draft OPCR for this office + period
        $opcr = Opcr::firstOrCreate(
            ['office_id' => $uwp->office_id, 'performance_period_id' => $uwp->performance_period_id],
            ['status' => 'draft']
        );

        // If OPCR was returned by PMT, reset it to draft so it can be resubmitted
        if ($opcr->status === 'returned') {
            $opcr->update(['status' => 'draft', 'return_remarks' => null, 'returned_by' => null]);
        }

        // Attach this UWP to the OPCR if not already attached
        $opcr->uwps()->syncWithoutDetaching([$uwp->id]);

        return back()->with('success', 'UWP approved.');
    }

    public function returnUwp(Request $request, int $id)
    {
        $request->validate(['remarks' => 'required|string|max:1000']);

        $uwp = UnitWorkPlan::where('office_id', Auth::user()->office_id)
            ->whereIn('status', ['submitted', 'approved'])
            ->findOrFail($id);

        $uwp->update([
            'status'         => 'returned',
            'return_remarks' => $request->remarks,
            'returned_by'    => Auth::id(),
        ]);

        return back()->with('success', 'UWP returned to supervisor.');
    }
}
