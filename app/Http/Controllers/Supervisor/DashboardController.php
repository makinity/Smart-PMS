<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Mpor;
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

        $teamCount      = User::where('office_id', $user->office_id)->where('role', 'employee')->count();
        $uwpStatus      = UnitWorkPlan::where('office_id', $user->office_id)
            ->when($period, fn ($query) => $query->where('performance_period_id', $period->id), fn ($query) => $query->whereRaw('1 = 0'))
            ->value('status') ?? 'Not created';

        $mporQuery = Mpor::query()
            ->where('office_id', $user->office_id);

        $pendingReviews = (clone $mporQuery)->where('status', 'submitted')->count();
        $endorsedCount  = (clone $mporQuery)->where('status', 'endorsed')->count();

        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));
        $dailyCounts = (clone $mporQuery)
            ->whereNotNull('submitted_at')
            ->where('submitted_at', '>=', Carbon::today()->subDays(6)->startOfDay())
            ->selectRaw('DATE(submitted_at) as day, COUNT(*) as count')
            ->groupBy('day')
            ->pluck('count', 'day');

        $submissionsChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn($d) => (int) ($dailyCounts[$d->toDateString()] ?? 0))->values()->toArray(),
        ];
        $statusChart = [
            'labels' => ['Pending', 'Endorsed', 'Approved'],
            'data' => [
                $pendingReviews,
                $endorsedCount,
                (clone $mporQuery)->where('status', 'approved')->count(),
            ],
        ];

        $recentSubmissions = (clone $mporQuery)
            ->with('employee:id,name,role')
            ->latest('submitted_at')
            ->limit(5)
            ->get()
            ->map(fn (Mpor $mpor) => [
                'id' => $mpor->id,
                'employee' => [
                    'name' => $mpor->employee?->name ?? '—',
                    'role' => $mpor->employee?->role,
                ],
                'status' => $mpor->status,
                'submitted_at' => $mpor->submitted_at?->format('M j, Y · h:i A') ?? '—',
                'month' => $mpor->month,
            ]);

        return \Inertia\Inertia::render('Supervisor/Dashboard', [
            'activePeriod'      => $period?->name ?? 'None',
            'teamCount'         => $teamCount,
            'uwpStatus'         => $uwpStatus,
            'pendingReviews'    => $pendingReviews,
            'endorsedCount'     => $endorsedCount,
            'recentSubmissions' => $recentSubmissions,
            'submissionsChart'  => $submissionsChart,
            'statusChart'       => $statusChart,
        ]);
    }
}
