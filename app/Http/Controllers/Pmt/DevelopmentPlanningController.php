<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DevelopmentPlanningController extends Controller
{
    public function index(Request $request)
    {
        $period  = PerformancePeriod::current();
        $search  = trim($request->get('search', ''));
        $rating  = $request->get('rating', '');

        $allowed = ['Unsatisfactory', 'Poor'];

        $query = Ipcr::with(['employee:id,name,position,office_id,profile_photo_path', 'employee.office:id,name'])
            ->whereIn('adjectival_rating', $allowed)
            ->whereNotNull('final_score');

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        if ($rating && in_array($rating, $allowed)) {
            $query->where('adjectival_rating', $rating);
        }

        if ($search !== '') {
            $query->whereHas('employee', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('position', 'like', "%{$search}%")
            )->orWhereHas('employee.office', fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
            );
        }

        $performers = $query->orderBy('final_score')->get()->map(fn ($ipcr) => [
            'ipcr_id'  => $ipcr->id,
            'name'     => $ipcr->employee?->name ?? '—',
            'position' => $ipcr->employee?->position ?? '—',
            'office'   => $ipcr->employee?->office?->name ?? '—',
            'avatar'   => $ipcr->employee?->profile_photo_url,
            'score'    => round((float) ($ipcr->pmt_adjusted_score ?? $ipcr->final_score), 2),
            'rating'   => $ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating,
        ])->values();

        $counts = [
            'all'             => $performers->count(),
            'Unsatisfactory'  => $performers->where('rating', 'Unsatisfactory')->count(),
            'Poor'            => $performers->where('rating', 'Poor')->count(),
        ];

        return Inertia::render('Pmt/DevelopmentPlanning/Index', [
            'performers' => $performers,
            'counts'     => $counts,
            'search'     => $search,
            'rating'     => $rating,
            'period'     => $period ? ['id' => $period->id, 'name' => $period->name] : null,
        ]);
    }
}
