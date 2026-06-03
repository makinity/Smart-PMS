<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;

class OpcrController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('DeptHead/Opcr/Index');
    }
}