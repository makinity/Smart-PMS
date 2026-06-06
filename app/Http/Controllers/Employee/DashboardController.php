<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\OrsEntry;
use App\Models\Mpor;
use App\Models\PerformancePeriod;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $period = PerformancePeriod::current();

        $tasksQuery = OrsEntry::query()
            ->where('employee_id', $user->id)
            ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'));

        $totalTasks = (clone $tasksQuery)->count();
        $completedTasks = (clone $tasksQuery)->whereIn('status', ['submitted', 'rated'])->count();
        $inProgressTasks = (clone $tasksQuery)->whereIn('status', ['recording', 'paused'])->count();
        $pendingTasks = max(0, $totalTasks - $completedTasks);

        $ipcrStatus = Ipcr::where('employee_id', $user->id)
            ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
            ->value('status') ?? 'Not started';

        $submissionStatus = Mpor::where('employee_id', $user->id)
            ->latest('created_at')
            ->value('status') ?? 'Not submitted';

        $recentTasks = (clone $tasksQuery)
            ->with(['ipcrItem.indicator.uwpMfo'])
            ->orderByDesc('submitted_at')
            ->orderByDesc('updated_at')
            ->limit(5)
            ->get()
            ->map(fn (OrsEntry $task) => [
                'id' => $task->id,
                'title' => $task->ipcrItem?->indicator?->uwpMfo?->title
                    ?? $task->ipcrItem?->indicator?->indicator_text
                    ?? 'Untitled task',
                'status' => $task->status,
                'due_date' => $task->ipcrItem?->indicator?->target_timeline
                    ?? $task->work_date?->format('M d, Y')
                    ?? '—',
            ]);

        $days = collect(range(6, 0))->map(fn ($offset) => Carbon::today()->subDays($offset));

        $completedByDay = (clone $tasksQuery)
            ->whereIn('status', ['submitted', 'rated'])
            ->whereNotNull('submitted_at')
            ->whereDate('submitted_at', '>=', Carbon::today()->subDays(6)->toDateString())
            ->get()
            ->groupBy(fn (OrsEntry $task) => $task->submitted_at?->toDateString() ?? $task->updated_at?->toDateString())
            ->map(fn ($group) => $group->count());

        $tasksChart = [
            'labels' => $days->map(fn ($day) => $day->format('M d'))->values()->toArray(),
            'data' => $days->map(fn ($day) => (int) ($completedByDay[$day->toDateString()] ?? 0))->values()->toArray(),
        ];

        $taskStatusChart = [
            'labels' => ['Completed', 'In Progress', 'Pending'],
            'data' => [
                $completedTasks,
                $inProgressTasks,
                max(0, $pendingTasks - $inProgressTasks),
            ],
        ];

        return Inertia::render('Employee/Dashboard', [
            'activePeriod' => $period?->name ?? 'None',
            'totalTasks' => $totalTasks,
            'completedTasks' => $completedTasks,
            'pendingTasks' => $pendingTasks,
            'ipcrStatus' => $ipcrStatus,
            'submissionStatus' => $submissionStatus,
            'recentTasks' => $recentTasks,
            'tasksChart' => $tasksChart,
            'taskStatusChart' => $taskStatusChart,
        ]);
    }
}
