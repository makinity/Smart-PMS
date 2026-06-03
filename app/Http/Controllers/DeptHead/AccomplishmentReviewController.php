<?php

namespace App\Http\Controllers\DeptHead;

use App\Http\Controllers\Controller;

class AccomplishmentReviewController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('DeptHead/AccomplishmentReview/Index');
    }
}