<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

class AuditLogsController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Admin/AuditLogs/Index');
    }
}