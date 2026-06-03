<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;

class AccomplishmentReviewController extends Controller
{
    public function index()
    {
        return \Inertia\Inertia::render('Pmt/AccomplishmentReview/Index');
    }
}