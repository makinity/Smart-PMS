<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;

class AccomplishmentController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Supervisor/Accomplishment/Index');
    }
}