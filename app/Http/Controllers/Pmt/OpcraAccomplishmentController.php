<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OpcraAccomplishmentController extends Controller
{
    public function index()
    {
        $submissions = OpcraAccomplishmentSubmission::with(['office', 'period', 'deptHead'])
            ->orderByRaw("FIELD(status,'submitted','returned','released')")
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn($s) => [
                'id'                      => $s->id,
                'office_name'             => $s->office?->name ?? '—',
                'period'                  => $s->period?->name ?? '—',
                'dept_head_name'          => $s->deptHead?->name ?? '—',
                'status'                  => $s->status,
                'computed_office_rating'  => $s->computed_office_rating,
                'final_office_rating'     => $s->final_office_rating,
                'final_adjectival_rating' => $s->final_adjectival_rating,
                'flagged_for_calibration' => $s->flagged_for_calibration,
                'submitted_at'            => $s->submitted_at?->toIso8601String(),
                'employee_stats'          => $this->employeeStats($s),
            ]);

        return Inertia::render('Pmt/OpcraAccomplishment/Index', [
            'submissions' => $submissions,
        ]);
    }

    public function show(OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        $opcraAccomplishment->load(['office', 'period', 'deptHead']);

        $employees = User::where('office_id', $opcraAccomplishment->office_id)
            ->where('role', 'employee')->get();

        $subMap = AccomplishmentSubmission::where('office_id', $opcraAccomplishment->office_id)
            ->where('performance_period_id', $opcraAccomplishment->performance_period_id)
            ->get()->keyBy('employee_id');

        $employeeData = $employees->map(fn($emp) => [
            'id'           => $emp->id,
            'name'         => $emp->name,
            'position'     => $emp->position ?? '—',
            'final_rating' => $subMap->get($emp->id)?->final_rating,
            'adjectival'   => $subMap->get($emp->id)?->final_adjectival_rating,
            'released'     => $subMap->get($emp->id)?->status === 'released_by_pmt',
            'released_at'  => $subMap->get($emp->id)?->pmt_action_at?->format('M j, Y'),
        ])->values();

        return Inertia::render('Pmt/OpcraAccomplishment/Show', [
            'submission' => [
                'id'                      => $opcraAccomplishment->id,
                'status'                  => $opcraAccomplishment->status,
                'computed_office_rating'  => $opcraAccomplishment->computed_office_rating,
                'final_office_rating'     => $opcraAccomplishment->final_office_rating,
                'final_adjectival_rating' => $opcraAccomplishment->final_adjectival_rating,
                'dept_head_remarks'       => $opcraAccomplishment->dept_head_remarks,
                'flagged_for_calibration' => $opcraAccomplishment->flagged_for_calibration,
                'pmt_remarks'             => $opcraAccomplishment->pmt_remarks,
                'submitted_at'            => $opcraAccomplishment->submitted_at?->toIso8601String(),
            ],
            'officeInfo' => [
                'name'      => $opcraAccomplishment->office?->name ?? '—',
                'period'    => $opcraAccomplishment->period?->name ?? '—',
                'dept_head' => $opcraAccomplishment->deptHead?->name ?? '—',
            ],
            'employees' => $employeeData,
        ]);
    }

    public function release(OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot release at this stage.');

        $score = (float) $opcraAccomplishment->computed_office_rating;

        $opcraAccomplishment->update([
            'status'                  => 'released',
            'final_office_rating'     => $score,
            'final_adjectival_rating' => $this->toAdjectival($score),
            'pmt_member_id'           => auth()->id(),
            'pmt_action_at'           => now(),
        ]);

        $this->notifyDeptHead($opcraAccomplishment,
            "Your office OPCR Accomplishment has been officially released by PMT. Final rating: {$this->toAdjectival($score)} ({$score}).");

        return back()->with('success', 'Office accomplishment released.');
    }

    public function calibrateAndRelease(Request $request, OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot calibrate at this stage.');

        $data = $request->validate([
            'final_office_rating'     => ['required', 'numeric', 'min:1', 'max:5'],
            'final_adjectival_rating' => ['required', 'string', 'in:Outstanding,Very Satisfactory,Satisfactory,Unsatisfactory,Poor'],
            'pmt_remarks'             => ['required', 'string', 'max:2000'],
        ]);

        $opcraAccomplishment->update([
            'status'                  => 'released',
            'final_office_rating'     => $data['final_office_rating'],
            'final_adjectival_rating' => $data['final_adjectival_rating'],
            'pmt_remarks'             => $data['pmt_remarks'],
            'pmt_member_id'           => auth()->id(),
            'pmt_action_at'           => now(),
        ]);

        $this->notifyDeptHead($opcraAccomplishment,
            "Your office OPCR Accomplishment has been calibrated and released. Final rating: {$data['final_adjectival_rating']} ({$data['final_office_rating']}).");

        return back()->with('success', 'Office accomplishment calibrated and released.');
    }

    public function return(Request $request, OpcraAccomplishmentSubmission $opcraAccomplishment)
    {
        abort_if($opcraAccomplishment->status !== 'submitted', 422, 'Cannot return at this stage.');

        $data = $request->validate(['pmt_remarks' => ['required', 'string', 'max:2000']]);

        $opcraAccomplishment->update([
            'status'        => 'returned',
            'pmt_remarks'   => $data['pmt_remarks'],
            'pmt_member_id' => auth()->id(),
            'pmt_action_at' => now(),
        ]);

        $this->notifyDeptHead($opcraAccomplishment,
            'Your OPCR Accomplishment submission was returned by PMT. Please review the remarks.');

        return back()->with('success', 'Submission returned to Department Head.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function toAdjectival(float $score): string
    {
        if ($score >= 4.5) return 'Outstanding';
        if ($score >= 3.5) return 'Very Satisfactory';
        if ($score >= 2.5) return 'Satisfactory';
        if ($score >= 1.5) return 'Unsatisfactory';
        return 'Poor';
    }

    private function employeeStats(OpcraAccomplishmentSubmission $s): array
    {
        $total    = User::where('office_id', $s->office_id)->where('role', 'employee')->count();
        $released = AccomplishmentSubmission::where('office_id', $s->office_id)
            ->where('performance_period_id', $s->performance_period_id)
            ->where('status', 'released_by_pmt')->count();
        return ['released' => $released, 'total' => $total];
    }

    private function notifyDeptHead(OpcraAccomplishmentSubmission $s, string $message): void
    {
        $deptHead = User::find($s->dept_head_id);
        $deptHead?->notify(new WorkflowEventNotification(
            type:    $s->status === 'released' ? 'success' : 'warning',
            event:   "opcra.{$s->status}",
            message: $message,
            url:     '/dept-head/opcr-accomplishment',
        ));
    }
}
