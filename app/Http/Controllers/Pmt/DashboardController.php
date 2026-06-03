<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Opcr;
use App\Models\AccomplishmentSubmission;
use App\Models\Office;
use App\Models\PerformancePeriod;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $period = PerformancePeriod::where('is_active', true)->first();

        $totalOffices     = Office::count();
        $totalEmployees   = User::where('role', 'employee')->count();
        $pendingOpcr      = Opcr::where('performance_period_id', $period?->id)->where('status', 'submitted')->count();
        $pendingCalibration = AccomplishmentSubmission::where('performance_period_id', $period?->id)
            ->where('status', 'dept_head_endorsed')->count();

        // Submissions by status for quick overview
        $submissionBreakdown = AccomplishmentSubmission::where('performance_period_id', $period?->id)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recentSubmissions = AccomplishmentSubmission::with(['employee:id,name,role'])
            ->where('performance_period_id', $period?->id)
            ->latest()->limit(5)
            ->get(['id', 'employee_id', 'status', 'created_at'])
            ->each(fn($s) => $s->setRelation('user', $s->employee));

        // Chart: submissions per day — last 7 days
        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));
        $dailyCounts = AccomplishmentSubmission::where('performance_period_id', $period?->id)
            ->where('created_at', '>=', Carbon::today()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
            ->groupBy('day')->pluck('count', 'day');

        $submissionsChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn($d) => (int) ($dailyCounts[$d->toDateString()] ?? 0))->values()->toArray(),
        ];

        // Chart: OPCR status breakdown (bar)
        $opcrChart = [
            'labels' => ['Submitted', 'Reviewed', 'Approved'],
            'data'   => [
                Opcr::where('performance_period_id', $period?->id)->where('status', 'submitted')->count(),
                Opcr::where('performance_period_id', $period?->id)->where('status', 'reviewed')->count(),
                Opcr::where('performance_period_id', $period?->id)->where('status', 'approved')->count(),
            ],
        ];

        return \Inertia\Inertia::render('Pmt/Dashboard', [
            'activePeriod'         => $period?->name ?? 'None',
            'totalOffices'         => $totalOffices,
            'totalEmployees'       => $totalEmployees,
            'pendingOpcr'          => $pendingOpcr,
            'pendingCalibration'   => $pendingCalibration,
            'submissionBreakdown'  => $submissionBreakdown,
            'recentSubmissions'    => $recentSubmissions,
            'submissionsChart'     => $submissionsChart,
            'opcrChart'            => $opcrChart,
        ]);
    }
}
