<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;

class DevelopmentPlanningController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Pmt/DevelopmentPlanning/Index');
    }
}