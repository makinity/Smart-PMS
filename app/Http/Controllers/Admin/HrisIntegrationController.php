<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminUserManagementService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HrisIntegrationController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/HrisIntegration/Index');
    }

    public function sync(Request $request, AdminUserManagementService $service)
    {
        $data = $request->validate([
            'base_url' => ['required', 'url'],
            'token' => ['required', 'string', 'min:8'],
        ]);

        $summary = $service->syncFromHris($data['base_url'], $data['token'], $request->user());

        return back()
            ->with('success', 'HRIS sync completed successfully.')
            ->with('summary', $summary);
    }
}
