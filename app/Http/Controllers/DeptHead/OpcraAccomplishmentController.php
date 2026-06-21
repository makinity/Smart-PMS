<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Opcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\PerformancePeriod;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use App\Services\OpcrOfficeRatingService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OpcraAccomplishmentController extends Controller
{
    public function index()
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();

        if (! $period) {
            return Inertia::render('DeptHead/OpcraAccomplishment/Index', [
                'period' => null,
                'submission' => null,
                'employees' => [],
                'stats' => ['released' => 0, 'total' => 0],
            ]);
        }

        $employees = User::where('office_id', $deptHead->office_id)
            ->where('role', 'employee')
            ->get();

        $subMap = AccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->get()
            ->keyBy('employee_id');

        $ipcrMap = \App\Models\Ipcr::where('performance_period_id', $period->id)
            ->whereIn('employee_id', $employees->pluck('id'))
            ->get()
            ->keyBy('employee_id');

        $employeeData = $employees->map(fn ($emp) => [
            'id' => $emp->id,
            'name' => $emp->name,
            'position' => $emp->position ?? '-',
            'avatar' => $emp->profile_photo_url,
            'system_score' => $ipcrMap->get($emp->id)?->final_score ? (float) $ipcrMap->get($emp->id)->final_score : null,
            'final_rating' => $subMap->get($emp->id)?->final_rating,
            'adjectival' => $subMap->get($emp->id)?->final_adjectival_rating,
            'pmt_remarks' => $subMap->get($emp->id)?->pmt_remarks,
            'status' => $subMap->get($emp->id)?->status ?? 'not_submitted',
            'released' => $subMap->get($emp->id)?->status === 'released_by_pmt',
        ])->values();

        $submission = OpcraAccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->first();

        $approvedOpcr = Opcr::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->with(['period', 'office', 'uwps.uwpFunctions.mfos.successIndicators.assignments.employee'])
            ->first();

        $released = $employeeData->where('released', true)->count();

        return Inertia::render('DeptHead/OpcraAccomplishment/Index', [
            'period' => ['id' => $period->id, 'name' => $period->name],
            'submission' => $submission ? [
                'id' => $submission->id,
                'status' => $submission->status,
                'computed_office_rating' => $submission->computed_office_rating,
                'final_office_rating' => $submission->final_office_rating,
                'final_adjectival_rating' => $submission->final_adjectival_rating,
                'dept_head_remarks' => $submission->dept_head_remarks,
                'flagged_for_calibration' => $submission->flagged_for_calibration,
                'pmt_remarks' => $submission->pmt_remarks,
                'submitted_at' => $submission->submitted_at?->toIso8601String(),
            ] : null,
            'employees' => $employeeData,
            'stats' => ['released' => $released, 'total' => $employeeData->count()],
            'hasApprovedOpcr' => (bool) $approvedOpcr,
            'approvedOpcrId' => $approvedOpcr?->id,
        ]);
    }

    public function export()
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 404);

        $approvedOpcr = Opcr::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->latest('id')
            ->first();

        abort_unless($approvedOpcr, 422, 'No approved OPCR found for the active performance period.');

        $request = request();
        $request->merge(['opcr_id' => $approvedOpcr->id]);

        return app(\App\Http\Controllers\StageThree\Forms\OpcrExcelExportController::class)->export($request);
    }

    public function resetForReview()
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $approvedOpcr = Opcr::with(['period', 'office', 'uwps.uwpFunctions.mfos.successIndicators.assignments.employee'])
            ->where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->first();

        abort_unless($approvedOpcr, 422, 'No approved OPCR found for the active performance period.');

        $submission = OpcraAccomplishmentSubmission::where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        $rating = app(OpcrOfficeRatingService::class)->calculate($approvedOpcr);

        $submission->update([
            'status' => 'submitted',
            'computed_office_rating' => $rating['overall_score'],
            'final_office_rating' => null,
            'final_adjectival_rating' => null,
            'pmt_member_id' => null,
            'pmt_remarks' => null,
            'pmt_action_at' => null,
        ]);

        return back()->with('success', 'OPCR accomplishment reset to PMT review.');
    }

    public function submit(Request $request)
    {
        $deptHead = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $data = $request->validate([
            'remarks' => ['nullable', 'string', 'max:2000'],
            'flagged_for_calibration' => ['boolean'],
        ]);

        $approvedOpcr = Opcr::with(['period', 'office', 'uwps.uwpFunctions.mfos.successIndicators.assignments.employee'])
            ->where('office_id', $deptHead->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->first();

        abort_unless($approvedOpcr, 422, 'No approved OPCR found for the active performance period.');

        $rating = app(OpcrOfficeRatingService::class)->calculate($approvedOpcr);
        abort_if(! $rating['is_ready'], 422, 'No released employee accomplishments found for this period.');

        $computedRating = (float) $rating['overall_score'];

        $submission = OpcraAccomplishmentSubmission::updateOrCreate(
            ['office_id' => $deptHead->office_id, 'performance_period_id' => $period->id],
            [
                'dept_head_id' => $deptHead->id,
                'status' => 'submitted',
                'computed_office_rating' => $computedRating,
                'dept_head_remarks' => $data['remarks'] ?? null,
                'flagged_for_calibration' => $data['flagged_for_calibration'] ?? false,
                'submitted_at' => now(),
            ]
        );

        User::where('role', 'pmt')->each(function (User $pmt) use ($deptHead, $submission) {
            $flag = $submission->flagged_for_calibration ? ' (Flagged for Calibration)' : '';
            $pmt->notify(new WorkflowEventNotification(
                type: 'info',
                event: 'opcra.submitted_to_pmt',
                message: "{$deptHead->office?->name} OPCR Accomplishment submitted by {$deptHead->name}{$flag}.",
                url: '/pmt/opcr-accomplishment',
            ));
        });

        return back()->with('success', 'OPCR Accomplishment submitted to PMT.');
    }
}
