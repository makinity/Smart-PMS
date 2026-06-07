<?php

namespace App\Http\Controllers\StageTwo\Monitoring;

use App\Http\Controllers\Controller;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Inertia\Inertia;

class TeamTasksController extends Controller
{
    public function index()
    {
        $supervisor = auth()->user();

        $period = PerformancePeriod::where('is_active', true)->first();

        $entries = OrsEntry::where('supervisor_id', $supervisor->id)
            ->when($period, fn($q) => $q->where('performance_period_id', $period->id))
            ->with(['employee:id,name', 'ipcrItem.indicator:id,indicator_text'])
            ->orderByDesc('work_date')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($e) => [
                'id'             => $e->id,
                'employee_name'  => $e->employee?->name ?? '—',
                'indicator'      => $e->ipcrItem?->indicator?->indicator_text ?? '—',
                'status'         => $e->status,
                'work_date'      => $e->work_date?->toDateString(),
                'quantity'       => $e->quantity,
                'notes'          => $e->notes,
                'total_seconds'  => $e->total_seconds ?? 0,
                'submitted_at'   => $e->submitted_at?->toIso8601String(),
            ]);

        return Inertia::render('Supervisor/TeamTasks/Index', [
            'entries' => $entries,
            'period'  => $period ? $period->name : null,
        ]);
    }
}
