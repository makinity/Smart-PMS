<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Opcr;
use App\Models\PerformancePeriod;
use App\Models\UwpIndicatorAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class IpcrTargetController extends Controller
{
    public function index()
    {
        $employee = Auth::user();

        // Find the active performance period
        $period = PerformancePeriod::current();

        if (! $period) {
            return Inertia::render('Employee/IpcrTarget/Index', [
                'ipcr'      => null,
                'functions' => [],
                'period'    => null,
            ]);
        }

        // Find the approved OPCR for this employee's office and period
        $opcr = Opcr::where('office_id', $employee->office_id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'approved')
            ->first();

        // Fetch or create the employee's IPCR
        $ipcr = null;
        if ($opcr) {
            $ipcr = Ipcr::firstOrCreate(
                [
                    'employee_id'           => $employee->id,
                    'performance_period_id' => $period->id,
                ],
                [
                    'opcr_id' => $opcr->id,
                    'status'  => 'draft',
                ]
            );

            // If IPCR has no items yet, snapshot the indicators assigned to this employee
            if ($ipcr->items()->count() === 0) {
                $assignedIds = UwpIndicatorAssignment::where('employee_id', $employee->id)
                    ->pluck('uwp_success_indicator_id');

                foreach ($assignedIds as $siId) {
                    IpcrItem::firstOrCreate([
                        'ipcr_id'                   => $ipcr->id,
                        'uwp_success_indicator_id'  => $siId,
                    ]);
                }
            }
        }

        // Build function → MFO → indicators tree from assigned items
        $functions = [];

        if ($ipcr) {
            $items = $ipcr->items()->with([
                'indicator.qetStandards',
                'indicator.uwpMfo.uwpFunction',
            ])->get();

            $fnMap = [];
            foreach ($items as $item) {
                $si  = $item->indicator;
                $mfo = $si->uwpMfo;
                $fn  = $mfo->uwpFunction;

                $fnId  = $fn->id;
                $mfoId = $mfo->id;

                if (! isset($fnMap[$fnId])) {
                    $fnMap[$fnId] = [
                        'id'            => $fn->id,
                        'name'          => $fn->name,
                        'function_type' => $fn->function_type,
                        'weight_percent'=> (float) $fn->weight_percent,
                        'sort_order'    => $fn->sort_order,
                        'mfos'          => [],
                    ];
                }

                if (! isset($fnMap[$fnId]['mfos'][$mfoId])) {
                    $fnMap[$fnId]['mfos'][$mfoId] = [
                        'id'             => $mfo->id,
                        'title'          => $mfo->title,
                        'weight_percent' => (float) $mfo->weight_percent,
                        'sort_order'     => $mfo->sort_order,
                        'indicators'     => [],
                    ];
                }

                // Group QET standards by dimension and rating
                $qet = [];
                foreach ($si->qetStandards as $std) {
                    $qet[$std->dimension][$std->rating] = $std->standard_text;
                }

                $fnMap[$fnId]['mfos'][$mfoId]['indicators'][] = [
                    'id'               => $si->id,
                    'indicator_text'   => $si->indicator_text,
                    'target_quantity'  => $si->target_quantity,
                    'target_timeline'  => $si->target_timeline,
                    'reference_code'   => $si->reference_code,
                    'sort_order'       => $si->sort_order,
                    'qet'              => $qet,
                ];
            }

            // Sort and flatten
            usort($fnMap, fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);
            foreach ($fnMap as &$fn) {
                usort($fn['mfos'], fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);
                foreach ($fn['mfos'] as &$mfo) {
                    usort($mfo['indicators'], fn ($a, $b) => ($a['sort_order'] ?? 0) <=> ($b['sort_order'] ?? 0));
                }
                $fn['mfos'] = array_values($fn['mfos']);
            }

            $functions = array_values($fnMap);
        }

        return Inertia::render('Employee/IpcrTarget/Index', [
            'ipcr'     => $ipcr ? [
                'id'           => $ipcr->id,
                'status'       => $ipcr->status,
                'committed_at' => $ipcr->committed_at?->toDateTimeString(),
            ] : null,
            'functions' => $functions,
            'period'    => $period ? [
                'id'   => $period->id,
                'name' => $period->name,
                'year' => $period->year ?? null,
            ] : null,
            'employee'  => [
                'name'   => $employee->name,
                'office' => $employee->office?->name ?? '—',
            ],
        ]);
    }

    public function commit(Request $request, int $id)
    {
        $employee = Auth::user();

        $ipcr = Ipcr::where('id', $id)
            ->where('employee_id', $employee->id)
            ->where('status', 'draft')
            ->firstOrFail();

        $ipcr->update([
            'status'       => 'committed',
            'committed_at' => now(),
        ]);

        return back()->with('success', 'IPCR committed successfully.');
    }
}