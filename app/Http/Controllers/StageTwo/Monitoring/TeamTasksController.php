<?php

namespace App\Http\Controllers\StageTwo\Monitoring;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TeamTasksController extends Controller
{
    public function index(Request $request)
    {
        $supervisor = auth()->user();
        $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();
        $periodId = $request->get('period_id');
        $period = $periodId
            ? (PerformancePeriod::find($periodId) ?? PerformancePeriod::current())
            : PerformancePeriod::current();

        // Show all employees in the same office as the supervisor,
        // not just those who selected this supervisor in ORS Task Logging.
        $officeId = $supervisor->employee?->office_id;

        $officeEmployeeUserIds = $officeId
            ? Employee::where('office_id', $officeId)
                ->where('is_active', true)
                ->pluck('user_id')
            : collect();

        $entries = OrsEntry::whereIn('employee_id', $officeEmployeeUserIds)
            ->when($period, fn ($q) => $q->where('performance_period_id', $period->id))
            ->with([
                'employee:id,name',
                'employee.employee.office:id,name',
                'ipcrItem.indicator:id,indicator_text,uwp_mfo_id',
                'ipcrItem.indicator.uwpMfo:id,title',
                'evidences',
                'monitoring.supervisor:id,name',
            ])
            ->orderByDesc('work_date')
            ->orderByDesc('updated_at')
            ->get()
            ->map(function ($e) use ($supervisor) {
                $mon = $e->monitoring->first();

                return [
                    // Card fields
                    'id' => $e->id,
                    'employee_name' => $e->employee?->name ?? '—',
                    'employee_avatar' => $e->employee?->profile_photo_url,
                    'indicator' => $e->ipcrItem?->indicator?->indicator_text ?? '—',
                    'status' => $e->status,
                    'work_date' => $e->work_date?->toDateString(),
                    'quantity' => $e->quantity,
                    'total_seconds' => $e->total_seconds ?? 0,
                    // Modal fields (matching Employee TaskDetailsModal shape)
                    'output_title' => $e->ipcrItem?->indicator?->uwpMfo?->title ?? '—',
                    'indicator_text' => $e->ipcrItem?->indicator?->indicator_text ?? '—',
                    'notes' => $e->notes,
                    'started_at' => $e->started_at?->toIso8601String(),
                    'stopped_at' => $e->stopped_at?->toIso8601String(),
                    'submitted_at' => $e->submitted_at?->toIso8601String(),
                    'locked_at' => $e->locked_at?->toIso8601String(),
                    'last_updated_at' => $e->updated_at?->toIso8601String(),
                    'supervisor_name' => $supervisor->name,
                    'supervisor_office' => $supervisor->office?->name ?? null,
                    'evidences' => $e->evidences->map(fn ($ev) => [
                        'id' => $ev->id,
                        'file_name' => $ev->file_name,
                        'file_size' => $ev->file_size,
                        'file_path' => Storage::url($ev->file_path),
                        'uploaded_at' => $ev->created_at?->toIso8601String(),
                    ])->values()->all(),
                    'rating' => $mon ? [
                        'quality_rating' => $mon->quality_rating,
                        'timeliness_rating' => $mon->timeliness_rating,
                        'remarks' => $mon->remarks,
                        'reviewer_name' => $mon->supervisor?->name ?? $supervisor->name,
                        'rated_at' => $mon->updated_at?->toIso8601String(),
                    ] : null,
                ];
            });

        return Inertia::render('Supervisor/TeamTasks/Index', [
            'entries' => $entries,
            'period' => $period ? ['id' => $period->id, 'name' => $period->name, 'is_active' => $period->is_active] : null,
            'allPeriods' => $allPeriods->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_active' => $p->is_active])->values(),
        ]);
    }
}
