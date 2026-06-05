<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UnitWorkPlan;
use App\Models\PerformancePeriod;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $user   = Auth::user();
        $period = PerformancePeriod::where('is_active', true)->first();

        $officeStaff = $this->safe(fn() =>
            User::where('office_id', $user->office_id)
                ->whereIn('role', ['employee', 'supervisor'])->count(), 0);

        $opcrStatus = $this->safe(fn() =>
            \App\Models\Opcr::where('office_id', $user->office_id)
                ->where('performance_period_id', $period?->id)
                ->value('status') ?? 'Not created', 'Not created');

        $uwpCount = $this->safe(fn() =>
            UnitWorkPlan::where('office_id', $user->office_id)
                ->where('performance_period_id', $period?->id)->count(), 0);

        $pendingEndorse = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::where('performance_period_id', $period?->id)
                ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
                ->where('status', 'supervisor_endorsed')->count(), 0);

        $recentSubmissions = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::with(['employee:id,name,role'])
                ->where('performance_period_id', $period?->id)
                ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
                ->latest()->limit(5)
                ->get(['id', 'employee_id', 'status', 'created_at']), collect());

        // Chart: submissions per day — last 7 days
        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));

        $dailyCounts = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::where('performance_period_id', $period?->id)
                ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
                ->where('created_at', '>=', Carbon::today()->subDays(6)->startOfDay())
                ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
                ->groupBy('day')->pluck('count', 'day'), collect());

        $submissionsChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn($d) => (int) ($dailyCounts[$d->toDateString()] ?? 0))->values()->toArray(),
        ];

        $staffChart = [
            'labels' => ['Employees', 'Supervisors'],
            'data'   => [
                $this->safe(fn() => User::where('office_id', $user->office_id)->where('role', 'employee')->count(), 0),
                $this->safe(fn() => User::where('office_id', $user->office_id)->where('role', 'supervisor')->count(), 0),
            ],
        ];

        return \Inertia\Inertia::render('DeptHead/Dashboard', [
            'activePeriod'      => $period?->name ?? 'None',
            'officeStaff'       => $officeStaff,
            'opcrStatus'        => $opcrStatus,
            'uwpCount'          => $uwpCount,
            'pendingEndorse'    => $pendingEndorse,
            'recentSubmissions' => $recentSubmissions,
            'submissionsChart'  => $submissionsChart,
            'staffChart'        => $staffChart,
        ]);
    }

    /** Run $fn safely; return $default if any exception (e.g. missing table) is thrown. */
    private function safe(callable $fn, mixed $default): mixed
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return $default;
        }
    }
}
