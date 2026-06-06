<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\Opcr;
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
        $period = PerformancePeriod::current();

        $officeStaff = $this->safe(fn() =>
            User::where('office_id', $user->office_id)
                ->whereIn('role', ['employee', 'supervisor'])->count(), 0);

        $opcrStatus = $this->safe(fn() =>
            Opcr::where('office_id', $user->office_id)
                ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
                ->value('status') ?? 'Not created', 'Not created');

        $uwpCount = $this->safe(fn() =>
            UnitWorkPlan::where('office_id', $user->office_id)
                ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
                ->count(), 0);

        $pendingEndorse = $this->safe(fn() =>
            UnitWorkPlan::where('office_id', $user->office_id)
                ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
                ->where('status', 'submitted')
                ->count(), 0);

        $recentSubmissions = $this->safe(fn() =>
            UnitWorkPlan::with(['creator:id,name,role'])
                ->where('office_id', $user->office_id)
                ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
                ->latest('submitted_at')
                ->limit(5)
                ->get(['id', 'created_by', 'status', 'submitted_at', 'period_covered']), collect());

        // Chart: submissions per day — last 7 days
        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));

        $dailyCounts = $this->safe(fn() =>
            UnitWorkPlan::where('office_id', $user->office_id)
                ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
                ->whereNotNull('submitted_at')
                ->where('submitted_at', '>=', Carbon::today()->subDays(6)->startOfDay())
                ->selectRaw('DATE(submitted_at) as day, COUNT(*) as count')
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
