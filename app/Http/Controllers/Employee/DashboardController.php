<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\PerformancePeriod;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $user   = Auth::user();
        $period = PerformancePeriod::where('is_active', true)->first();

        $totalTasks     = $this->safe(fn() => \App\Models\MyTask::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->count(), 0);
        $completedTasks = $this->safe(fn() => \App\Models\MyTask::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->where('status', 'done')->count(), 0);
        $pendingTasks   = max(0, $totalTasks - $completedTasks);

        $ipcrStatus = $this->safe(fn() =>
            \App\Models\Ipcr::where('employee_id', $user->id)->where('performance_period_id', $period?->id)->value('status') ?? 'Not started', 'Not started');

        $submissionStatus = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::where('employee_id', $user->id)
                ->where('performance_period_id', $period?->id)->value('status') ?? 'Not submitted', 'Not submitted');

        $recentTasks = $this->safe(fn() =>
            \App\Models\MyTask::with('ipcrItem:id,output_title,target_timeline')
                ->where('office_id', $user->office_id)->where('performance_period_id', $period?->id)
                ->latest()->limit(5)->get()
                ->map(fn($task) => [
                    'id'       => $task->id,
                    'title'    => $task->ipcrItem?->output_title,
                    'status'   => $task->status,
                    'due_date' => $task->ipcrItem?->target_timeline,
                ]), collect());

        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));

        $dailyDone = $this->safe(fn() =>
            \App\Models\MyTask::where('office_id', $user->office_id)
                ->where('performance_period_id', $period?->id)->where('status', 'done')
                ->where('updated_at', '>=', Carbon::today()->subDays(6)->startOfDay())
                ->selectRaw('DATE(updated_at) as day, COUNT(*) as count')
                ->groupBy('day')->pluck('count', 'day'), collect());

        $tasksChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn($d) => (int) ($dailyDone[$d->toDateString()] ?? 0))->values()->toArray(),
        ];

        $inProgress = $this->safe(fn() =>
            \App\Models\MyTask::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->where('status', 'in_progress')->count(), 0);

        $taskStatusChart = [
            'labels' => ['Completed', 'In Progress', 'Pending'],
            'data'   => [$completedTasks, $inProgress, max(0, $pendingTasks - $inProgress)],
        ];

        return \Inertia\Inertia::render('Employee/Dashboard', [
            'activePeriod'     => $period?->name ?? 'None',
            'totalTasks'       => $totalTasks,
            'completedTasks'   => $completedTasks,
            'pendingTasks'     => $pendingTasks,
            'ipcrStatus'       => $ipcrStatus,
            'submissionStatus' => $submissionStatus,
            'recentTasks'      => $recentTasks,
            'tasksChart'       => $tasksChart,
            'taskStatusChart'  => $taskStatusChart,
        ]);
    }

    private function safe(callable $fn, mixed $default): mixed
    {
        try { return $fn(); } catch (\Throwable) { return $default; }
    }
}
