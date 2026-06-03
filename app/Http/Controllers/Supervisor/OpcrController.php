<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;

class OpcrController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Supervisor/OrsMonitoring/Index');
    }
}