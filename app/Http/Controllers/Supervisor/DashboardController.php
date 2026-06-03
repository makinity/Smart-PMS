<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UnitWorkPlan;
use App\Models\AccomplishmentSubmission;
use App\Models\Mpor;
use App\Models\PerformancePeriod;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $user   = Auth::user();
        $period = PerformancePeriod::where('is_active', true)->first();

        $teamCount       = User::where('office_id', $user->office_id)->where('role', 'employee')->count();
        $uwpStatus       = UnitWorkPlan::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->value('status') ?? 'Not created';
        $pendingReviews  = AccomplishmentSubmission::where('performance_period_id', $period?->id)
            ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
            ->where('status', 'submitted_to_supervisor')->count();
        $endorsedCount   = AccomplishmentSubmission::where('performance_period_id', $period?->id)
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

        // Chart: submission status breakdown (bar)
        $statusChart = [
            'labels' => ['Pending', 'Endorsed', 'Released'],
            'data'   => [
                $pendingReviews,
                $endorsedCount,
                AccomplishmentSubmission::where('performance_period_id', $period?->id)
                    ->whereHas('employee', fn($q) => $q->where('office_id', $user->office_id))
                    ->where('status', 'released_by_pmt')->count(),
            ],
        ];

        return \Inertia\Inertia::render('Supervisor/Dashboard', [
            'activePeriod'       => $period?->name ?? 'None',
            'teamCount'          => $teamCount,
            'uwpStatus'          => $uwpStatus,
            'pendingReviews'     => $pendingReviews,
            'endorsedCount'      => $endorsedCount,
            'recentSubmissions'  => $recentSubmissions,
            'submissionsChart'   => $submissionsChart,
            'statusChart'        => $statusChart,
        ]);
    }
}
