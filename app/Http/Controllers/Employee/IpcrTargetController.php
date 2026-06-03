<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;

class IpcrTargetController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Employee/IpcrTarget/Index');
    }
}