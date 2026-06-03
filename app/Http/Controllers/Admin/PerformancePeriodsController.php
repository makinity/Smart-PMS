<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class PerformancePeriodsController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Admin/PerformancePeriods/Index');
    }
}