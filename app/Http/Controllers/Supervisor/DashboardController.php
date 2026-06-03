<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;

class DashboardController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Supervisor/Dashboard');
    }
}