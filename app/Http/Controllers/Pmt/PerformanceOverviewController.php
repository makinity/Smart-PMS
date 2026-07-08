<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
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
            ->where(function ($q) {
                $q->whereIn('pmt_adjusted_rating', self::ALL_RATINGS)
                  ->orWhereIn('adjectival_rating', self::ALL_RATINGS);
            })
            ->where(function ($q) {
                $q->where(fn ($q2) => $q2->whereNotNull('pmt_adjusted_score')->where('pmt_adjusted_score', '>', 0))
                  ->orWhere(fn ($q2) => $q2->whereNotNull('final_score')->where('final_score', '>', 0));
            });

        if ($period) {
            $query->where('performance_period_id', $period->id);
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

        $ipcrs = $query->get();

        // Load released AccomplishmentSubmissions for these IPCRs — these carry the
        // official PMT-released score (including any calibration done during review).
        $submissions = AccomplishmentSubmission::whereIn('ipcr_id', $ipcrs->pluck('id'))
            ->where('status', 'released_by_pmt')
            ->get(['ipcr_id', 'final_rating', 'final_adjectival_rating'])
            ->keyBy('ipcr_id');

        $plans = DevelopmentPlan::whereIn('ipcr_id', $ipcrs->pluck('id'))
            ->get()->keyBy('ipcr_id');

        $performers = $ipcrs->map(function (Ipcr $ipcr) use ($plans, $submissions) {
            $submission = $submissions->get($ipcr->id);
            $systemScore = round((float) $ipcr->final_score, 2);

            // Score priority: released submission → pmt_adjusted → final_score
            if ($submission && $submission->final_rating > 0) {
                $score        = round((float) $submission->final_rating, 2);
                $r            = $submission->final_adjectival_rating
                                    ?: ($ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating);
                // Only mark as calibrated if PMT actually changed the score
                $isCalibrated = $ipcr->pmt_adjusted_score > 0
                                || abs($score - $systemScore) >= 0.01;
            } elseif ($ipcr->pmt_adjusted_score > 0) {
                $score        = round((float) $ipcr->pmt_adjusted_score, 2);
                $r            = $ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating;
                $isCalibrated = true;
            } else {
                $score        = $systemScore;
                $r            = $ipcr->adjectival_rating ?? '';
                $isCalibrated = false;
            }

            if (!in_array($r, self::ALL_RATINGS, true) || $score <= 0) {
                return null;
            }

            $isLow = in_array($r, self::LOW_RATINGS, true);
            $plan  = $plans->get($ipcr->id);

            return [
                'ipcr_id'           => $ipcr->id,
                'user_id'           => $ipcr->employee_id,
                'name'              => $ipcr->employee?->name ?? '—',
                'position'          => $ipcr->employee?->position ?? '—',
                'office'            => $ipcr->employee?->office?->name ?? '—',
                'avatar'            => $ipcr->employee?->profile_photo_url,
                'score'             => $score,
                'rating'            => $r,
                'is_calibrated'     => $isCalibrated,
                'is_low'            => $isLow,
                'plan_status'       => $isLow ? ($plan?->status ?? '') : null,
                'plan_status_label' => $isLow ? $this->statusLabel($plan?->status) : null,
            ];
        })->filter()->values();

        // Sort: by rating tier then score descending
        $performers = $performers->sort(function ($a, $b) {
            $tierA = array_search($a['rating'], self::ALL_RATINGS);
            $tierB = array_search($b['rating'], self::ALL_RATINGS);
            if ($tierA !== $tierB) return $tierA <=> $tierB;
            return $b['score'] <=> $a['score'];
        })->values();

        // Count by resolved rating (before tab filter)
        $counts = [
            'all'               => $performers->count(),
            'Outstanding'       => $performers->where('rating', 'Outstanding')->count(),
            'Very Satisfactory' => $performers->where('rating', 'Very Satisfactory')->count(),
            'Satisfactory'      => $performers->where('rating', 'Satisfactory')->count(),
            'Unsatisfactory'    => $performers->where('rating', 'Unsatisfactory')->count(),
            'Poor'              => $performers->where('rating', 'Poor')->count(),
        ];

        // Apply rating tab filter on the resolved rating
        if ($rating && in_array($rating, self::ALL_RATINGS, true)) {
            $performers = $performers->filter(fn ($p) => $p['rating'] === $rating)->values();
        }

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
