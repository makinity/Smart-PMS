<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class OfficeController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Admin/Offices/Index');
    }
}