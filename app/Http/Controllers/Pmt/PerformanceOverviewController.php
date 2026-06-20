<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PerformanceOverviewController extends Controller
{
    private const ALL_RATINGS = ['Outstanding', 'Very Satisfactory', 'Satisfactory', 'Unsatisfactory', 'Poor'];
    private const LOW_RATINGS  = ['Unsatisfactory', 'Poor'];

    public function index(Request $request)
    {
        $period = PerformancePeriod::current();
        $search = trim($request->get('search', ''));
        $rating = $request->get('rating', '');

        $query = Ipcr::with(['employee:id,name,position,office_id,profile_photo_path', 'employee.office:id,name'])
            ->whereIn('adjectival_rating', self::ALL_RATINGS)
            ->whereNotNull('final_score')
            ->where('final_score', '>', 0);

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        if ($rating && in_array($rating, self::ALL_RATINGS, true)) {
            $query->where('adjectival_rating', $rating);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereHas('employee', fn ($q2) => $q2
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('position', 'like', "%{$search}%")
                )->orWhereHas('employee.office', fn ($q2) => $q2
                    ->where('name', 'like', "%{$search}%")
                );
            });
        }

        // Top performers: descending score; low performers: ascending (worst first)
        $ipcrs = $query->orderByRaw("
            CASE adjectival_rating
                WHEN 'Outstanding'       THEN 1
                WHEN 'Very Satisfactory' THEN 2
                WHEN 'Satisfactory'      THEN 3
                WHEN 'Unsatisfactory'    THEN 4
                WHEN 'Poor'              THEN 5
            END
        ")->orderBy('final_score', 'desc')->get();

        $plans = DevelopmentPlan::whereIn('ipcr_id', $ipcrs->pluck('id'))
            ->get()->keyBy('ipcr_id');

        $performers = $ipcrs->map(function (Ipcr $ipcr) use ($plans) {
            $plan   = $plans->get($ipcr->id);
            $r      = $ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating;
            $isLow  = in_array($r, self::LOW_RATINGS, true);

            return [
                'ipcr_id'          => $ipcr->id,
                'user_id'          => $ipcr->employee_id,
                'name'             => $ipcr->employee?->name ?? '—',
                'position'         => $ipcr->employee?->position ?? '—',
                'office'           => $ipcr->employee?->office?->name ?? '—',
                'avatar'           => $ipcr->employee?->profile_photo_url,
                'score'            => round((float) ($ipcr->pmt_adjusted_score ?? $ipcr->final_score), 2),
                'rating'           => $r,
                'is_low'           => $isLow,
                'plan_status'      => $isLow ? ($plan?->status ?? '') : null,
                'plan_status_label'=> $isLow ? $this->statusLabel($plan?->status) : null,
            ];
        })->values();

        $counts = [
            'all'               => $performers->count(),
            'Outstanding'       => $performers->where('rating', 'Outstanding')->count(),
            'Very Satisfactory' => $performers->where('rating', 'Very Satisfactory')->count(),
            'Satisfactory'      => $performers->where('rating', 'Satisfactory')->count(),
            'Unsatisfactory'    => $performers->where('rating', 'Unsatisfactory')->count(),
            'Poor'              => $performers->where('rating', 'Poor')->count(),
        ];

        return Inertia::render('Pmt/PerformanceOverview/Index', [
            'performers' => $performers,
            'counts'     => $counts,
            'search'     => $search,
            'rating'     => $rating,
            'period'     => $period ? ['id' => $period->id, 'name' => $period->name] : null,
        ]);
    }

    private function statusLabel(?string $status): string
    {
        return match ($status) {
            DevelopmentPlan::STATUS_DRAFT             => 'Draft',
            DevelopmentPlan::STATUS_PENDING_DETAILS   => 'Pending Details',
            DevelopmentPlan::STATUS_SUBMITTED_TO_LD   => 'Submitted to L&D',
            default                                   => 'No Plan Yet',
        };
    }
}
