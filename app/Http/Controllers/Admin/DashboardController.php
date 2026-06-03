<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Office;
use App\Models\PerformancePeriod;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $totalUsers   = User::count();
        $totalOffices = Office::count();
        $activePeriod = PerformancePeriod::where('is_active', true)->value('name') ?? 'None';
        $activeUsers  = User::where('is_active', true)->count();

        // New users per day for last 7 days
        $last7 = collect(range(6, 0))->map(fn($d) => now()->subDays($d)->format('Y-m-d'));
        $newUsersRaw = User::where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')->pluck('count', 'date');
        $newUsersChart = [
            'labels' => $last7->map(fn($d) => date('M d', strtotime($d)))->values()->toArray(),
            'data'   => $last7->map(fn($d) => (int)($newUsersRaw[$d] ?? 0))->values()->toArray(),
        ];

        // Active users per day as "activity" line
        $activityRaw = User::where('updated_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw('DATE(updated_at) as date, COUNT(*) as count')
            ->groupBy('date')->pluck('count', 'date');
        $activityChart = [
            'labels' => $newUsersChart['labels'],
            'data'   => $last7->map(fn($d) => (int)($activityRaw[$d] ?? 0))->values()->toArray(),
        ];

        $recentUsers = User::latest()->limit(5)->get(['id','name','email','role','created_at']);

        return \Inertia\Inertia::render('Admin/Dashboard', compact(
            'totalUsers', 'totalOffices', 'activePeriod', 'activeUsers',
            'newUsersChart', 'activityChart', 'recentUsers'
        ));
    }
}
