<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;

class QarController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Pmt/Qar/Index');
    }
}