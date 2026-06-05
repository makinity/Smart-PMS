<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\UnitWorkPlan;
use App\Models\UwpFunction;
use App\Models\UwpMfo;
use App\Models\UwpSuccessIndicator;
use App\Models\UwpQetStandard;
use App\Models\UwpIndicatorAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UwpEditorController extends Controller
{
    private function authorizeUwp(UnitWorkPlan $uwp): void
    {
        abort_unless($uwp->office_id === Auth::user()->office_id, 403);
        abort_unless($uwp->isEditableBySupervisor(), 403, 'UWP is not editable.');
    }

    // ── UWP ──────────────────────────────────────────────────────────────────

    public function saveDraft(Request $request, UnitWorkPlan $uwp)
    {
        $this->authorizeUwp($uwp);
        $uwp->update(['status' => 'draft']);
        return response()->json(['status' => 'draft']);
    }

    public function submit(Request $request, UnitWorkPlan $uwp)
    {
        $this->authorizeUwp($uwp);
        $uwp->update(['status' => 'submitted']);
        return back()->with('success', 'UWP submitted for review.');
    }

    // ── Functions ────────────────────────────────────────────────────────────

    public function storeFunction(Request $request, UnitWorkPlan $uwp)
    {
        $this->authorizeUwp($uwp);
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'function_type'  => 'required|in:core,support',
            'weight_percent' => 'nullable|numeric|min:0|max:100',
        ]);
        $fn = $uwp->uwpFunctions()->create([
            ...$data,
            'sort_order' => $uwp->uwpFunctions()->max('sort_order') + 1,
        ]);
        return response()->json(['id' => $fn->id, 'name' => $fn->name, 'function_type' => $fn->function_type, 'weight_percent' => $fn->weight_percent, 'mfos' => []]);
    }

    public function updateFunction(Request $request, UnitWorkPlan $uwp, UwpFunction $fn)
    {
        $this->authorizeUwp($uwp);
        $data = $request->validate([
            'name'           => 'required|string|max:255',
            'function_type'  => 'required|in:core,support',
            'weight_percent' => 'nullable|numeric|min:0|max:100',
        ]);
        $fn->update($data);
        return response()->json(['ok' => true]);
    }

    public function destroyFunction(Request $request, UnitWorkPlan $uwp, UwpFunction $fn)
    {
        $this->authorizeUwp($uwp);
        $fn->delete();
        return response()->json(['ok' => true]);
    }

    // ── MFOs ─────────────────────────────────────────────────────────────────

    public function storeMfo(Request $request, UnitWorkPlan $uwp)
    {
        $this->authorizeUwp($uwp);
        $data = $request->validate([
            'uwp_function_id' => 'required|exists:uwp_functions,id',
            'title'           => 'required|string|max:255',
            'weight_percent'  => 'nullable|numeric|min:0|max:100',
        ]);
        $mfo = UwpMfo::create([
            ...$data,
            'sort_order' => UwpMfo::where('uwp_function_id', $data['uwp_function_id'])->max('sort_order') + 1,
        ]);
        return response()->json(['id' => $mfo->id, 'title' => $mfo->title, 'weight_percent' => $mfo->weight_percent, 'successIndicators' => []]);
    }

    public function updateMfo(Request $request, UnitWorkPlan $uwp, UwpMfo $mfo)
    {
        $this->authorizeUwp($uwp);
        $data = $request->validate(['title' => 'required|string|max:255', 'weight_percent' => 'nullable|numeric']);
        $mfo->update($data);
        return response()->json(['ok' => true]);
    }

    public function destroyMfo(Request $request, UnitWorkPlan $uwp, UwpMfo $mfo)
    {
        $this->authorizeUwp($uwp);
        $mfo->delete();
        return response()->json(['ok' => true]);
    }

    // ── Indicators ───────────────────────────────────────────────────────────

    public function storeIndicator(Request $request, UnitWorkPlan $uwp)
    {
        $this->authorizeUwp($uwp);
        $data = $request->validate([
            'uwp_mfo_id'      => 'required|exists:uwp_mfos,id',
            'indicator_text'  => 'required|string',
            'target_quantity' => 'nullable|string|max:50',
            'target_timeline' => 'nullable|string|max:500',
            'allotted_budget' => 'nullable|numeric|min:0',
        ]);
        $si = UwpSuccessIndicator::create([
            ...$data,
            'sort_order' => UwpSuccessIndicator::where('uwp_mfo_id', $data['uwp_mfo_id'])->max('sort_order') + 1,
        ]);
        return response()->json([
            'id'              => $si->id,
            'indicator_text'  => $si->indicator_text,
            'target_quantity' => $si->target_quantity,
            'target_timeline' => $si->target_timeline,
            'allotted_budget' => $si->allotted_budget,
            'qetStandards'    => [],
            'assignments'     => [],
        ]);
    }

    public function updateIndicator(Request $request, UnitWorkPlan $uwp, UwpSuccessIndicator $si)
    {
        $this->authorizeUwp($uwp);
        $data = $request->validate([
            'indicator_text'  => 'sometimes|string',
            'target_quantity' => 'nullable|string|max:50',
            'target_timeline' => 'nullable|string|max:500',
            'allotted_budget' => 'nullable|numeric|min:0',
        ]);
        $si->update($data);
        return response()->json(['ok' => true]);
    }

    public function destroyIndicator(Request $request, UnitWorkPlan $uwp, UwpSuccessIndicator $si)
    {
        $this->authorizeUwp($uwp);
        $si->delete();
        return response()->json(['ok' => true]);
    }

    // ── QET Standards ────────────────────────────────────────────────────────

    public function saveQet(Request $request, UnitWorkPlan $uwp, UwpSuccessIndicator $si)
    {
        $this->authorizeUwp($uwp);
        $request->validate([
            'standards'                  => 'required|array',
            'standards.*.dimension'      => 'required|in:q,e,t',
            'standards.*.rating'         => 'required|integer|between:1,5',
            'standards.*.standard_text'  => 'required|string',
        ]);
        $si->qetStandards()->delete();
        $si->qetStandards()->createMany($request->input('standards'));
        return response()->json(['ok' => true]);
    }

    // ── Assignments ──────────────────────────────────────────────────────────

    public function saveAssign(Request $request, UnitWorkPlan $uwp, UwpSuccessIndicator $si)
    {
        $this->authorizeUwp($uwp);
        $request->validate(['employee_ids' => 'required|array', 'employee_ids.*' => 'exists:users,id']);
        $si->assignments()->delete();
        foreach ($request->input('employee_ids') as $empId) {
            $si->assignments()->create([
                'employee_id'  => $empId,
                'assigned_by'  => Auth::id(),
                'assigned_at'  => now(),
            ]);
        }
        $si->loadMissing('assignments.employee');
        return response()->json([
            'assignments' => $si->assignments->map(fn($a) => [
                'employee_id' => $a->employee_id,
                'employee'    => ['id' => $a->employee?->id, 'name' => $a->employee?->name, 'position' => $a->employee?->position],
            ]),
        ]);
    }
}
