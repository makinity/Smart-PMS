<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TopPerformersController extends Controller
{
    public function index(Request $request)
    {
        $period  = PerformancePeriod::current();
        $search  = trim($request->get('search', ''));
        $rating  = $request->get('rating', '');

        $allowed = ['Outstanding', 'Very Satisfactory', 'Satisfactory'];

        $query = Ipcr::with(['employee:id,name,position,office_id,profile_photo_path', 'employee.office:id,name'])
            ->whereIn('adjectival_rating', $allowed)
            ->whereNotNull('final_score')
            ->where('final_score', '>', 0);

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

        $performers = $query->orderByDesc('final_score')->get()->map(fn ($ipcr) => [
            'ipcr_id'  => $ipcr->id,
            'name'     => $ipcr->employee?->name ?? '—',
            'position' => $ipcr->employee?->position ?? '—',
            'office'   => $ipcr->employee?->office?->name ?? '—',
            'avatar'   => $ipcr->employee?->profile_photo_url,
            'score'    => round((float) ($ipcr->pmt_adjusted_score ?? $ipcr->final_score), 2),
            'rating'   => $ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating,
        ])->values();

        $counts = [
            'all'               => $performers->count(),
            'Outstanding'       => $performers->where('rating', 'Outstanding')->count(),
            'Very Satisfactory' => $performers->where('rating', 'Very Satisfactory')->count(),
            'Satisfactory'      => $performers->where('rating', 'Satisfactory')->count(),
        ];

        return Inertia::render('Pmt/TopPerformers/Index', [
            'performers' => $performers,
            'counts'     => $counts,
            'search'     => $search,
            'rating'     => $rating,
            'period'     => $period ? ['id' => $period->id, 'name' => $period->name] : null,
        ]);
    }
}
