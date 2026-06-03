<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;

class TopPerformersController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Pmt/TopPerformers/Index');
    }
}