<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class HrisIntegrationController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Admin/HrisIntegration/Index');
    }
}