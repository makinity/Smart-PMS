<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;

class EmployeeCalibrationController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Pmt/EmployeeCalibration/Index');
    }
}