<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SmporIpcrAccomplishmentController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $period = PerformancePeriod::current();

        if (! $period) {
            return Inertia::render('Employee/Accomplishment/Index', [
                'period' => null,
                'submission' => null,
                'smporMeta' => null,
                'ipcrMeta' => null,
            ]);
        }

        $submission = AccomplishmentSubmission::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->first();

        $smporMeta = $this->buildSmporMeta($user, $period, $submission);

        $ipcr = Ipcr::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->with('items.indicator.uwpMfo.uwpFunction')
            ->first();

        // IPCR meta (score + rating for dashboard card)
        $ipcrMeta = $ipcr ? $this->buildIpcrMeta($ipcr) : null;

        return Inertia::render('Employee/Accomplishment/Index', [
            'period' => ['id' => $period->id, 'name' => $period->name, 'start_date' => $period->start_date->toDateString(), 'end_date' => $period->end_date->toDateString()],
            'submission' => $submission ? $this->formatSubmission($submission) : null,
            'smporMeta' => $smporMeta,
            'ipcrMeta' => $ipcrMeta,
        ]);
    }

    public function smpor()
    {
        $user = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 404, 'No active performance period.');

        $submission = AccomplishmentSubmission::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->first();

        $mpors = $this->resolveMpors($user, $period, $submission);

        $ipcr = Ipcr::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->with('items.indicator.uwpMfo.uwpFunction')
            ->first();

        return Inertia::render('Employee/Accomplishment/SmporPreview', [
            'period' => ['id' => $period->id, 'name' => $period->name],
            'employee' => ['name' => $user->name, 'office' => $user->office?->name],
            'source' => $submission?->dataset_source ?? $mpors['source'],
            'table' => $this->buildSmporTable($mpors['ids'], $period, $ipcr),
        ]);
    }

    public function ipcr()
    {
        $user = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 404);

        $ipcr = Ipcr::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->with([
                'items.indicator.uwpMfo.uwpFunction',
                'items.indicator.qetStandards',
            ])
            ->first();

        abort_unless($ipcr, 404, 'No IPCR found.');

        $sections = $this->buildIpcrSections($ipcr, $period);

        // Compute per-function-type weighted average scores
        $typeAratings = [];
        foreach ($sections as $fn) {
            $type = strtolower($fn['function_type'] ?? 'core');
            $weight = (float) ($fn['weight'] ?? 0);
            $aRatings = [];
            foreach ($fn['mfos'] as $mfo) {
                foreach ($mfo['indicators'] as $ind) {
                    if ($ind['ratings']['A'] !== null) {
                        $aRatings[] = (float) $ind['ratings']['A'];
                    }
                }
            }
            if (! empty($aRatings)) {
                $avg = array_sum($aRatings) / count($aRatings);
                $typeAratings[] = [
                    'label' => $fn['name'],
                    'weight' => $weight,
                    'weighted_score' => round($avg * ($weight / 100), 2),
                ];
            }
        }

        return Inertia::render('Employee/Accomplishment/IpcrPreview', [
            'period' => ['id' => $period->id, 'name' => $period->name],
            'employee' => ['name' => $user->name, 'office' => $user->office?->name],
            'sections' => $sections,
            'meta' => array_merge($this->buildIpcrMeta($ipcr), ['type_scores' => $typeAratings]),
        ]);
    }

    public function submit(Request $request)
    {
        $user = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 422, 'No active performance period.');

        $ipcr = Ipcr::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->first();
        abort_unless($ipcr, 422, 'No IPCR found for this period.');

        $data = $request->validate([
            'remarks' => ['nullable', 'string', 'max:5000'],
            'supporting_files' => ['nullable', 'array'],
            'supporting_files.*' => ['file', 'max:51200'],
        ]);

        // Resolve MPORs
        // Rule: every month from period start up to (not including) current month must have an approved MPOR
        $periodStart  = $period->start_date->copy()->startOfMonth();
        $currentMonth = now()->startOfMonth();
        $requiredMonths = [];
        for ($m = $periodStart->copy(); $m->lt($currentMonth); $m->addMonth()) {
            if ($m->gt($period->end_date)) break;
            $requiredMonths[] = $m->format('Y-m');
        }

        $missingMonths = [];
        foreach ($requiredMonths as $month) {
            $exists = \App\Models\Mpor::where('employee_id', $user->id)
                ->where('month', $month)
                ->where('status', 'approved')
                ->exists();
            if (! $exists) {
                $missingMonths[] = $month;
            }
        }
        if (! empty($missingMonths)) {
            return back()->withErrors(['message' => 'Cannot submit: missing approved MPOR for month(s): ' . implode(', ', $missingMonths) . '.']);
        }

        $mporResult = $this->resolveMpors($user, $period, null);
        abort_if(empty($mporResult['ids']), 422, 'No eligible MPORs found for this period.');

        // Rule: both Q1 and Q2 QARs must be pmt_approved before submitting accomplishment
        $approvedQars = QarHeader::where('office_id', $user->office_id)
            ->where('performance_period_id', $period->id)
            ->where('pmt_status', 'validated')
            ->pluck('quarter_key');

        $year = $period->start_date->year;
        $missingQars = [];
        if (! $approvedQars->contains("{$year}-Q1")) $missingQars[] = 'Q1';
        if (! $approvedQars->contains("{$year}-Q2")) $missingQars[] = 'Q2';
        if (! empty($missingQars)) {
            return back()->withErrors(['message' => 'Cannot submit: QAR ' . implode(' and ', $missingQars) . ' must be PMT-approved first.']);
        }

        // Handle file uploads
        $attachments = [];
        foreach ($request->file('supporting_files', []) as $file) {
            $path = $file->store("accomplishment_submissions/period_{$period->id}/employee_{$user->id}", 'public');
            $attachments[] = [
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
            ];
        }

        // Upsert submission
        $submission = AccomplishmentSubmission::updateOrCreate(
            ['employee_id' => $user->id, 'performance_period_id' => $period->id],
            [
                'office_id' => $user->office_id,
                'ipcr_id' => $ipcr->id,
                'dataset_source' => $mporResult['source'],
                'qar_header_id' => $mporResult['qar_header_id'] ?? null,
                'status' => 'submitted_to_supervisor',
                'employee_remarks' => $data['remarks'] ?? null,
                'attachments' => $attachments ?: null,
                'submitted_at' => now(),
                'supervisor_id' => User::where('office_id', $user->office_id)
                    ->where('role', 'supervisor')
                    ->value('id'),
                'dept_head_id' => $user->office?->head_id,
            ]
        );

        $submission->mpors()->sync($mporResult['ids']);

        // Notify supervisor
        if ($submission->supervisor_id) {
            $supervisor = User::find($submission->supervisor_id);
            $supervisor?->notify(new WorkflowEventNotification(
                type: 'info',
                event: 'accomplishment.submitted_to_supervisor',
                message: "{$user->name} submitted their accomplishment report for review.",
                url: route('supervisor.accomplishment.show', $submission),
            ));
        }

        return back()->with('success', 'Accomplishment submitted successfully.');
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function resolveMpors($user, $period, $submission): array
    {
        // Level 1: already submitted snapshot
        if ($submission && ! in_array($submission->status, ['draft', 'returned_to_employee'])) {
            return ['ids' => $submission->mpors->pluck('id')->toArray(), 'source' => $submission->dataset_source, 'qar_header_id' => $submission->qar_header_id];
        }

        // Level 2: PMT-approved QAR
        $qar = QarHeader::where('office_id', $user->office_id)
            ->where('performance_period_id', $period->id)
            ->where('pmt_status', 'validated')
            ->first();

        if ($qar) {
            $ids = QarMporLink::where('qar_header_id', $qar->id)
                ->whereHas('mpor', fn ($q) => $q->where('employee_id', $user->id))
                ->pluck('mpor_id')
                ->toArray();
            if (! empty($ids)) {
                return ['ids' => $ids, 'source' => 'qar_official', 'qar_header_id' => $qar->id];
            }
        }

        // Level 3: fallback
        $ids = Mpor::where('employee_id', $user->id)
            ->whereIn('status', ['submitted', 'approved', 'endorsed'])
            ->pluck('id')
            ->toArray();

        return ['ids' => $ids, 'source' => 'submitted_mpor_preview', 'qar_header_id' => null];
    }

    private function buildSmporMeta($user, $period, $submission): array
    {
        $mporResult = $this->resolveMpors($user, $period, $submission);
        $count = count($mporResult['ids']);

        // Quick totals from ORS entries linked to these MPORs
        $totals = OrsEntry::whereIn('ipcr_item_id', function ($q) use ($user) {
            $q->select('id')->from('ipcr_items')
                ->whereIn('ipcr_id', function ($q2) use ($user) {
                    $q2->select('id')->from('ipcrs')->where('employee_id', $user->id);
                });
        })
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->selectRaw('SUM(quantity) as total_qty, COUNT(*) as total_entries')
            ->first();

        return [
            'source' => $mporResult['source'],
            'mpor_count' => $count,
            'total_qty' => (int) ($totals->total_qty ?? 0),
            'total_entries' => (int) ($totals->total_entries ?? 0),
        ];
    }

    private function buildIpcrMeta(Ipcr $ipcr): array
    {
        // Prefer the PMT-released official rating (adjusted if calibrated, else the
        // system score the PMT released), falling back to the IPCR's system-computed
        // score when not yet released.
        $submission = AccomplishmentSubmission::where('employee_id', $ipcr->employee_id)
            ->where('performance_period_id', $ipcr->performance_period_id)
            ->where('status', 'released_by_pmt')
            ->latest()
            ->first();

        $score = (float) ($submission?->final_rating
            ?? $ipcr->pmt_adjusted_score
            ?? $ipcr->final_score
            ?? 0);
        $rating = $submission?->final_adjectival_rating
            ?? $ipcr->pmt_adjusted_rating
            ?? $ipcr->adjectival_rating
            ?? null;

        return [
            'score' => round($score, 2),
            'rating' => $rating,
            'ipcr_id' => $ipcr->id,
        ];
    }

    private function buildSmporTable(array $mporIds, $period, ?Ipcr $ipcr = null): array
    {
        if (empty($mporIds) && ! $ipcr) {
            return ['months' => [], 'sections' => []];
        }

        // Get period months
        $start = $period->start_date->copy()->startOfMonth();
        $end = $period->end_date->copy()->endOfMonth();
        $months = [];
        for ($m = $start->copy(); $m->lte($end); $m->addMonth()) {
            $months[] = $m->format('M');
        }

        // All rated ORS entries for these MPORs' employees in this period
        $entries = empty($mporIds) ? collect() : OrsEntry::whereIn('ipcr_item_id', function ($q) use ($mporIds) {
            $q->select('ipcr_items.id')->from('ipcr_items')
                ->join('ipcrs', 'ipcrs.id', '=', 'ipcr_items.ipcr_id')
                ->join('mpors', 'mpors.employee_id', '=', 'ipcrs.employee_id')
                ->whereIn('mpors.id', $mporIds);
        })
            ->where('status', 'rated')
            ->whereNotNull('quantity')
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring' => fn ($q) => $q->latest()])
            ->get();

        // Pre-seed all assigned MFOs from IPCR with zero data
        $sections = [];
        if ($ipcr) {
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) {
                    continue;
                }
                $fnType = strtolower($fn->name);
                $outputTitle = $mfo->title;
                if (! isset($sections[$fnType])) {
                    $sections[$fnType] = [];
                }
                if (! isset($sections[$fnType][$outputTitle])) {
                    $sections[$fnType][$outputTitle] = [];
                }
            }
        }

        // Group by function_type → output_title → month
        foreach ($entries as $entry) {
            $indicator = $entry->ipcrItem?->indicator;
            $mfo = $indicator?->uwpMfo;
            $fn = $mfo?->uwpFunction;
            $fnType = strtolower($fn?->name ?? 'core');
            $outputTitle = $mfo?->title ?? 'Other';
            $monthLabel = Carbon::parse($entry->work_date)->format('M');
            $mon = $entry->monitoring->first();
            $qty = (int) $entry->quantity;

            $sections[$fnType][$outputTitle][$monthLabel]['qty'] = ($sections[$fnType][$outputTitle][$monthLabel]['qty'] ?? 0) + $qty;
            $sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$outputTitle][$monthLabel]['time_pts'] = ($sections[$fnType][$outputTitle][$monthLabel]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
        }

        $fnWeights = [];
        if ($ipcr) {
            foreach ($ipcr->items as $item) {
                $fn = $item->indicator?->uwpMfo?->uwpFunction;
                if ($fn) $fnWeights[strtolower($fn->name)] = (int) round((float) $fn->weight_percent);
            }
        }
        foreach ($entries as $entry) {
            $fn = $entry->ipcrItem?->indicator?->uwpMfo?->uwpFunction;
            if ($fn) $fnWeights[strtolower($fn->name)] = (int) round((float) $fn->weight_percent);
        }

        $result = [];
        foreach ($sections as $fnType => $outputs) {
            $rows = [];
            foreach ($outputs as $title => $monthData) {
                $totalQty = array_sum(array_column($monthData, 'qty'));
                $totalQual = array_sum(array_column($monthData, 'qual_pts'));
                $totalTime = array_sum(array_column($monthData, 'time_pts'));
                $row = ['output' => $title, 'months' => [], 'total_qty' => $totalQty,
                    'avg_qual' => $totalQty > 0 ? round($totalQual / $totalQty, 2) : 0,
                    'avg_time' => $totalQty > 0 ? round($totalTime / $totalQty, 2) : 0];
                foreach ($months as $m) {
                    $row['months'][$m] = [
                        'qty' => $monthData[$m]['qty'] ?? 0,
                        'qual_pts' => $monthData[$m]['qual_pts'] ?? 0,
                        'time_pts' => $monthData[$m]['time_pts'] ?? 0,
                    ];
                }
                $rows[] = $row;
            }
            $result[] = ['type' => $fnType, 'weight' => $fnWeights[$fnType] ?? 0, 'rows' => $rows];
        }

        return ['months' => $months, 'sections' => $result];
    }

    private function buildIpcrSections(Ipcr $ipcr, $period): array
    {
        $sections = [];
        $fnMap = [];

        foreach ($ipcr->items as $item) {
            $indicator = $item->indicator;
            $mfo = $indicator?->uwpMfo;
            $fn = $mfo?->uwpFunction;
            if (! $fn || ! $mfo) {
                continue;
            }

            $fnKey = $fn->id;
            if (! isset($fnMap[$fnKey])) {
                $fnMap[$fnKey] = ['id' => $fn->id, 'name' => $fn->name, 'function_type' => $fn->function_type, 'weight' => $fn->weight_percent ?? null, 'mfos' => []];
            }

            $mfoKey = $mfo->id;
            if (! isset($fnMap[$fnKey]['mfos'][$mfoKey])) {
                $fnMap[$fnKey]['mfos'][$mfoKey] = ['id' => $mfo->id, 'title' => $mfo->title, 'indicators' => []];
            }

            // Compute Q/E/T/A from ORS entries
            $ratings = $this->computeIndicatorRatings($item->id, $period);

            $fnMap[$fnKey]['mfos'][$mfoKey]['indicators'][] = [
                'id' => $item->id,
                'indicator_text' => $indicator->indicator_text,
                'target_quantity' => $indicator->target_quantity,
                'target_timeline' => $indicator->target_timeline,
                'standards' => $indicator->qetStandards->map(fn ($s) => [
                    'dimension' => $s->dimension, 'rating' => $s->rating, 'standard_text' => $s->standard_text,
                ])->values()->all(),
                'ratings' => $ratings,
            ];
        }

        foreach ($fnMap as &$fn) {
            $fn['mfos'] = array_values($fn['mfos']);
        }

        return array_values($fnMap);
    }

    private function computeIndicatorRatings(int $ipcrItemId, $period): array
    {
        $entries = OrsEntry::where('ipcr_item_id', $ipcrItemId)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with('monitoring')
            ->get();

        if ($entries->isEmpty()) {
            return ['Q' => null, 'E' => null, 'T' => null, 'A' => null];
        }

        $totalQty = $entries->sum('quantity');
        $qualPts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
        $timePts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
        $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
        $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;
        $target = is_numeric($entries->first()?->ipcrItem?->indicator?->target_quantity)
            ? (float) $entries->first()->ipcrItem->indicator->target_quantity : null;
        $E = ($target && $target > 0) ? min(5.00, round(($totalQty / $target) * 5, 2)) : $Q;
        $A = ($Q !== null && $T !== null) ? round(($Q + $E + $T) / 3, 2) : null;

        return compact('Q', 'E', 'T', 'A');
    }

    private function formatSubmission(AccomplishmentSubmission $s): array
    {
        return [
            'id' => $s->id,
            'status' => $s->status,
            'dataset_source' => $s->dataset_source,
            'remarks' => $s->employee_remarks,
            'attachments' => collect($s->attachments ?? [])->map(fn ($a) => [
                ...$a, 'url' => Storage::url($a['path']),
            ])->values()->all(),
            'submitted_at' => $s->submitted_at?->toIso8601String(),
            'final_rating' => $s->final_rating,
            'final_adjectival_rating' => $s->final_adjectival_rating,
            'pmt_remarks' => $s->pmt_remarks,
        ];
    }
}
