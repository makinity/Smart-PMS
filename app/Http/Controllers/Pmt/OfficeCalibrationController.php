<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;

class OfficeCalibrationController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Pmt/OfficeCalibration/Index');
    }
}