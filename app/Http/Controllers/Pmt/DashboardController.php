<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\User;
use App\Models\Office;
use App\Models\Opcr;
use App\Models\PerformancePeriod;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $period = PerformancePeriod::current();

        $totalOffices   = $this->safe(fn() => Office::count(), 0);
        $totalEmployees = $this->safe(fn() => User::where('role', 'employee')->count(), 0);

        $pendingOpcr = $this->safe(fn() =>
            Opcr::where('performance_period_id', $period?->id)->where('status', 'submitted')->count(), 0);

        $pendingCalibration = $this->safe(fn() =>
            Ipcr::where('performance_period_id', $period?->id)
                ->where('status', 'committed')->count(), 0);

        $submissionBreakdown = $this->safe(fn() =>
            Ipcr::where('performance_period_id', $period?->id)
                ->selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status'), collect());

        $recentSubmissions = $this->safe(fn() =>
            Ipcr::with(['employee:id,name,role,office_id', 'opcr.office:id,name', 'period:id,name'])
                ->where('performance_period_id', $period?->id)
                ->whereNotNull('committed_at')
                ->latest('committed_at')
                ->limit(5)
                ->get(['id', 'employee_id', 'opcr_id', 'performance_period_id', 'status', 'committed_at'])
                ->map(fn (Ipcr $ipcr) => [
                    'id' => $ipcr->id,
                    'employee' => [
                        'name' => $ipcr->employee?->name ?? 'Unknown Employee',
                        'role' => $ipcr->employee?->role ?? 'employee',
                    ],
                    'office' => $ipcr->opcr?->office?->name ?? '—',
                    'period' => $ipcr->period?->name ?? ($period?->name ?? '—'),
                    'status' => $ipcr->status,
                    'committed_at' => $ipcr->committed_at?->format('M d, Y'),
                ]), collect());

        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));

        $dailyCounts = $this->safe(fn() =>
            Ipcr::where('performance_period_id', $period?->id)
                ->whereNotNull('committed_at')
                ->where('committed_at', '>=', Carbon::today()->subDays(6)->startOfDay())
                ->selectRaw('DATE(committed_at) as day, COUNT(*) as count')
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
