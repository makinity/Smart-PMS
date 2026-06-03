<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;

class MporController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Supervisor/Mpor/Index');
    }
}