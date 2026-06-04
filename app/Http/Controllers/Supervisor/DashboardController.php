<?php

namespace App\Http\Controllers\Supervisor;

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

        $teamCount      = User::where('office_id', $user->office_id)->where('role', 'employee')->count();
        $uwpStatus      = UnitWorkPlan::where('office_id', $user->office_id)->where('performance_period_id', $period?->id)->value('status') ?? 'Not created';
        $pendingReviews = 0;
        $endorsedCount  = 0;

        $days = collect(range(6, 0))->map(fn($i) => Carbon::today()->subDays($i));
        $submissionsChart = [
            'labels' => $days->map(fn($d) => $d->format('M d'))->values()->toArray(),
            'data'   => $days->map(fn() => 0)->values()->toArray(),
        ];
        $statusChart = ['labels' => ['Pending', 'Endorsed', 'Released'], 'data' => [0, 0, 0]];

        return \Inertia\Inertia::render('Supervisor/Dashboard', [
            'activePeriod'      => $period?->name ?? 'None',
            'teamCount'         => $teamCount,
            'uwpStatus'         => $uwpStatus,
            'pendingReviews'    => $pendingReviews,
            'endorsedCount'     => $endorsedCount,
            'recentSubmissions' => [],
            'submissionsChart'  => $submissionsChart,
            'statusChart'       => $statusChart,
        ]);
    }
}
