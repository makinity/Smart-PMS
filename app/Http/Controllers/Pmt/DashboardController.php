<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Office;
use App\Models\PerformancePeriod;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $period = PerformancePeriod::where('is_active', true)->first();

        $totalOffices   = $this->safe(fn() => Office::count(), 0);
        $totalEmployees = $this->safe(fn() => User::where('role', 'employee')->count(), 0);

        $pendingOpcr = $this->safe(fn() =>
            \App\Models\Opcr::where('performance_period_id', $period?->id)->where('status', 'submitted')->count(), 0);

        $pendingCalibration = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::where('performance_period_id', $period?->id)
                ->where('status', 'dept_head_endorsed')->count(), 0);

        $submissionBreakdown = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::where('performance_period_id', $period?->id)
                ->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status'), collect());

        $recentSubmissions = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::with(['employee:id,name,role'])
                ->where('performance_period_id', $period?->id)
                ->latest()->limit(5)->get(['id', 'employee_id', 'status', 'created_at']), collect());

        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));

        $dailyCounts = $this->safe(fn() =>
            \App\Models\AccomplishmentSubmission::where('performance_period_id', $period?->id)
                ->where('created_at', '>=', Carbon::today()->subDays(6)->startOfDay())
                ->selectRaw('DATE(created_at) as day, COUNT(*) as count')
                ->groupBy('day')->pluck('count', 'day'), collect());

        $submissionsChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn($d) => (int) ($dailyCounts[$d->toDateString()] ?? 0))->values()->toArray(),
        ];

        $opcrChart = [
            'labels' => ['Submitted', 'Reviewed', 'Approved'],
            'data'   => [
                $this->safe(fn() => \App\Models\Opcr::where('performance_period_id', $period?->id)->where('status', 'submitted')->count(), 0),
                $this->safe(fn() => \App\Models\Opcr::where('performance_period_id', $period?->id)->where('status', 'reviewed')->count(), 0),
                $this->safe(fn() => \App\Models\Opcr::where('performance_period_id', $period?->id)->where('status', 'approved')->count(), 0),
            ],
        ];

        return \Inertia\Inertia::render('Pmt/Dashboard', [
            'activePeriod'        => $period?->name ?? 'None',
            'totalOffices'        => $totalOffices,
            'totalEmployees'      => $totalEmployees,
            'pendingOpcr'         => $pendingOpcr,
            'pendingCalibration'  => $pendingCalibration,
            'submissionBreakdown' => $submissionBreakdown,
            'recentSubmissions'   => $recentSubmissions,
            'submissionsChart'    => $submissionsChart,
            'opcrChart'           => $opcrChart,
        ]);
    }

    private function safe(callable $fn, mixed $default): mixed
    {
        try { return $fn(); } catch (\Throwable) { return $default; }
    }
}
