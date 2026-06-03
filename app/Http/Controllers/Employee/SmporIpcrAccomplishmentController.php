<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;

class SmporIpcrAccomplishmentController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Employee/Accomplishment/Index');
    }
}