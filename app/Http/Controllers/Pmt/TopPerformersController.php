<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TopPerformersController extends Controller
{
    public function index(Request $request)
    {
        $allPeriods = PerformancePeriod::orderByDesc('start_date')->get();
        $periodId = $request->get('period_id');
        $period = $periodId
            ? PerformancePeriod::find($periodId) ?? PerformancePeriod::current()
            : PerformancePeriod::current();
        $search  = trim($request->get('search', ''));
        $rating  = $request->get('rating', '');

        $allowed = ['Outstanding', 'Very Satisfactory', 'Satisfactory'];

        $query = Ipcr::with(['employee:id,name', 'employee.employee.office:id,name'])
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
            $query->where(fn ($q) => $q
                ->whereHas('employee', fn ($uq) => $uq->where('name', 'like', "%{$search}%"))
                ->orWhereHas('employee.employee', fn ($eq) => $eq->where('position', 'like', "%{$search}%")
                    ->orWhereHas('office', fn ($oq) => $oq->where('name', 'like', "%{$search}%")))
            );
        }

        $performers = $query->orderByDesc('final_score')->get()->map(fn ($ipcr) => [
            'ipcr_id'  => $ipcr->id,
            'user_id'  => $ipcr->employee_id,
            'name'     => $ipcr->employee?->name ?? '—',
            'position' => $ipcr->employee?->employee?->position ?? '—',
            'office'   => $ipcr->employee?->employee?->office?->name ?? '—',
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
            'allPeriods' => $allPeriods->map(fn ($p) => ['id' => $p->id, 'name' => $p->name, 'is_active' => $p->is_active])->values(),
            'period'     => $period ? ['id' => $period->id, 'name' => $period->name, 'is_active' => $period->is_active] : null,
        ]);
    }

    public function show(User $user)
    {
        $user->load('employee.office:id,name,code');

        // All IPCRs with period info
        $ipcrs = Ipcr::with('period:id,name,start_date,end_date')
            ->where('employee_id', $user->id)
            ->whereNotNull('final_score')
            ->orderByDesc('performance_period_id')
            ->get()
            ->map(fn ($ipcr) => [
                'id'              => $ipcr->id,
                'period'          => $ipcr->period?->name,
                'period_dates'    => $ipcr->period ? $ipcr->period->start_date->format('M Y').' – '.$ipcr->period->end_date->format('M Y') : null,
                'status'          => $ipcr->status,
                'final_score'     => $ipcr->final_score ? round((float)$ipcr->final_score, 2) : null,
                'adjectival'      => $ipcr->adjectival_rating,
                'pmt_score'       => $ipcr->pmt_adjusted_score ? round((float)$ipcr->pmt_adjusted_score, 2) : null,
                'pmt_adjectival'  => $ipcr->pmt_adjusted_rating,
                'committed_at'    => $ipcr->committed_at?->format('M d, Y'),
            ]);

        // All accomplishment submissions
        $submissions = AccomplishmentSubmission::with('period:id,name')
            ->where('employee_id', $user->id)
            ->orderByDesc('performance_period_id')
            ->get()
            ->map(fn ($s) => [
                'id'               => $s->id,
                'period'           => $s->period?->name,
                'status'           => $s->status,
                'final_rating'     => $s->final_rating ? round((float)$s->final_rating, 2) : null,
                'final_adjectival' => $s->final_adjectival_rating,
                'flagged'          => $s->dept_head_flagged_for_calibration,
                'submitted_at'     => $s->submitted_at?->format('M d, Y'),
                'pmt_action_at'    => $s->pmt_action_at?->format('M d, Y'),
            ]);

        // All development plans
        $idps = DevelopmentPlan::with('period:id,name')
            ->where('employee_id', $user->id)
            ->orderByDesc('performance_period_id')
            ->get()
            ->map(fn ($d) => [
                'id'               => $d->id,
                'period'           => $d->period?->name,
                'status'           => $d->status,
                'source_score'     => $d->source_score ? round((float)$d->source_score, 2) : null,
                'source_rating'    => $d->source_rating,
                'lnd_sync_status'  => $d->lnd_sync_status,
                'lnd_reference_id' => $d->lnd_reference_id,
                'submitted_to_ld_at' => $d->submitted_to_ld_at?->format('M d, Y'),
                'idp_rows'         => $d->idp_rows ?? [],
            ]);

        // Build history: merge ipcrs + submissions per period_name
        $history = [];
        foreach ($ipcrs as $ipcr) {
            $period = $ipcr['period'];
            if (! isset($history[$period])) {
                $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null];
            }
            $history[$period]['ipcr'] = $ipcr;
        }
        foreach ($submissions as $sub) {
            $period = $sub['period'];
            if (! isset($history[$period])) {
                $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null];
            }
            $history[$period]['submission'] = $sub;
        }
        foreach ($idps as $idp) {
            $period = $idp['period'];
            if (! isset($history[$period])) {
                $history[$period] = ['period' => $period, 'ipcr' => null, 'submission' => null, 'idp' => null];
            }
            $history[$period]['idp'] = $idp;
        }

        // Stats
        $ratedSubmissions = $submissions->filter(fn ($s) => $s['final_rating'] !== null);
        $avgRating = $ratedSubmissions->count() > 0
            ? round($ratedSubmissions->avg('final_rating'), 2)
            : null;
        $bestSubmission = $ratedSubmissions->sortByDesc('final_rating')->first();

        $stats = [
            'periods_rated' => $ratedSubmissions->count(),
            'avg_rating'    => $avgRating,
            'best_rating'   => $bestSubmission ? $bestSubmission['final_rating'] : null,
            'best_period'   => $bestSubmission ? $bestSubmission['period'] : null,
            'idps_submitted'=> $idps->where('status', DevelopmentPlan::STATUS_SUBMITTED_TO_LD)->count(),
        ];

        // Chart data: final ratings over periods (reversed = oldest first)
        $chartData = $ratedSubmissions->reverse()->values()->map(fn ($s) => [
            'period' => $s['period'],
            'score'  => $s['final_rating'],
        ]);

        return Inertia::render('Pmt/TopPerformers/Show', [
            'employee'  => [
                'id'           => $user->id,
                'employee_id'  => $user->employee?->employee_id,
                'name'         => $user->name,
                'email'        => $user->email,
                'position'     => $user->employee?->position,
                'role'         => $user->role,
                'is_active'    => $user->employee?->is_active,
                'is_disabled'  => $user->employee?->is_disabled,
                'activated_at' => $user->employee?->activated_at?->format('M d, Y'),
                'created_at'   => $user->created_at->format('M d, Y'),
                'avatar'       => $user->profile_photo_url,
                'office'       => $user->employee?->office ? ['name' => $user->employee->office->name, 'code' => $user->employee->office->code] : null,
            ],
            'stats'     => $stats,
            'history'   => array_values($history),
            'ipcrs'     => $ipcrs,
            'idps'      => $idps,
            'chartData' => $chartData,
        ]);
    }
}
