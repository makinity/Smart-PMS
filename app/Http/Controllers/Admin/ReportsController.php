<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class ReportsController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Admin/Reports/Index');
    }
}