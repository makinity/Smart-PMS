<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Opcr;
use App\Models\AccomplishmentSubmission;
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

        $officeStaff    = User::where('office_id', $user->office_id)->whereIn('role', ['employee','supervisor'])->count();
        $opcrStatus     = Opcr::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->value('status') ?? 'Not created';
        $uwpCount       = UnitWorkPlan::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->count();
        $pendingEndorse = AccomplishmentSubmission::where('performance_period_id', $period?->id)
            ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
            ->where('status', 'supervisor_endorsed')->count();

        $recentSubmissions = AccomplishmentSubmission::with(['employee:id,name,role'])
            ->where('performance_period_id', $period?->id)
            ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
            ->latest()->limit(5)
            ->get(['id', 'employee_id', 'status', 'created_at'])
            ->each(fn($s) => $s->setRelation('user', $s->employee));

        // Chart: submissions per day — last 7 days
        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));
        $dailyCounts = AccomplishmentSubmission::where('performance_period_id', $period?->id)
            ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
            ->where('created_at', '>=', Carbon::today()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')->pluck('count', 'day');

        $submissionsChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn($d) => (int) ($dailyCounts[$d->toDateString()] ?? 0))->values()->toArray(),
        ];

        // Chart: staff by role (bar)
        $staffChart = [
            'labels' => ['Employees', 'Supervisors'],
            'data'   => [
                User::where('office_id', $user->office_id)->where('role', 'employee')->count(),
                User::where('office_id', $user->office_id)->where('role', 'supervisor')->count(),
            ],
        ];

        return \Inertia\Inertia::render('DeptHead/Dashboard', [
            'activePeriod'       => $period?->name ?? 'None',
            'officeStaff'        => $officeStaff,
            'opcrStatus'         => $opcrStatus,
            'uwpCount'           => $uwpCount,
            'pendingEndorse'     => $pendingEndorse,
            'recentSubmissions'  => $recentSubmissions,
            'submissionsChart'   => $submissionsChart,
            'staffChart'         => $staffChart,
        ]);
    }
}
