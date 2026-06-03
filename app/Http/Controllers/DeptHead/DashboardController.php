<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;

class DashboardController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('DeptHead/Dashboard');
    }
}