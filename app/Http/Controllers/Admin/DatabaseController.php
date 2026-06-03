<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class DatabaseController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Admin/Database/Index');
    }
}