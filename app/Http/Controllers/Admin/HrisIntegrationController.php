<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminUserManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class HrisIntegrationController extends Controller
{
    public function index()
    {
        $lastSync = Activity::query()
            ->where('event', 'hris_sync')
            ->latest()
            ->first();

        return Inertia::render('Admin/HrisIntegration/Index', [
            'sync' => $lastSync?->properties?->toArray() ?? [],
        ]);
    }

    public function sync(Request $request, AdminUserManagementService $service)
    {
        $data = $request->validate([
            'base_url' => ['required', 'url'],
            'token' => ['required', 'string', 'min:8'],
        ]);

        $summary = $service->syncFromHris($data['base_url'], $data['token'], $request->user());

        return back()->with('summary', $summary);
    }
}
