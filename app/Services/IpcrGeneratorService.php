<?php

namespace App\Services;

use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Opcr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class IpcrGeneratorService
{
    public function generateFromOpcr(Opcr $opcr): void
    {
        $opcr->load([
            'unitWorkPlans.office',
            'unitWorkPlans.performancePeriod',
            'unitWorkPlans.uwpFunctions' => function ($query) {
                $query->orderBy('sort_order')->with([
                    'mfos' => function ($mfoQuery) {
                        $mfoQuery->orderBy('sort_order')->with([
                            'successIndicators' => function ($indicatorQuery) {
                                $indicatorQuery->orderBy('sort_order')->with([
                                    'qetStandards',
                                    'assignments.employee',
                                ]);
                            },
                        ]);
                    },
                ]);
            },
            'unitWorkPlan.office',
            'unitWorkPlan.performancePeriod',
            'unitWorkPlan.uwpFunctions' => function ($query) {
                $query->orderBy('sort_order')->with([
                    'mfos' => function ($mfoQuery) {
                        $mfoQuery->orderBy('sort_order')->with([
                            'successIndicators' => function ($indicatorQuery) {
                                $indicatorQuery->orderBy('sort_order')->with([
                                    'qetStandards',
                                    'assignments.employee',
                                ]);
                            },
                        ]);
                    },
                ]);
            },
        ]);

        $sourceUwps = $opcr->sourceUnitWorkPlans();
        if ($sourceUwps->isEmpty()) {
            return;
        }

        $hasUnitWorkPlanId = Schema::hasColumn('ipcrs', 'unit_work_plan_id');
        $hasPerformancePeriodId = Schema::hasColumn('ipcrs', 'performance_period_id');
        $hasOfficeId = Schema::hasColumn('ipcrs', 'office_id');
        $hasGeneratedAt = Schema::hasColumn('ipcrs', 'generated_at');

        $byEmployee = [];

        foreach ($sourceUwps as $uwp) {
            $uwp->loadMissing([
                'office',
                'performancePeriod',
                'uwpFunctions.mfos.successIndicators.qetStandards',
                'uwpFunctions.mfos.successIndicators.assignments.employee',
            ]);

            foreach ($uwp->uwpFunctions as $function) {
                foreach ($function->mfos as $mfo) {
                    foreach ($mfo->successIndicators as $indicator) {
                        $standardsByRating = [];
                        foreach ([5, 4, 3, 2, 1] as $rating) {
                            $standardsByRating[(string) $rating] = ['Q' => [], 'E' => [], 'T' => []];
                        }

                        foreach ($indicator->qetStandards as $standard) {
                            $rating = (string) $standard->rating;
                            if (!isset($standardsByRating[$rating])) {
                                continue;
                            }

                            $dimension = strtolower((string) $standard->dimension);
                            if (in_array($dimension, ['q', 'quality'], true)) {
                                $standardsByRating[$rating]['Q'][] = (string) $standard->standard_text;
                            } elseif (in_array($dimension, ['e', 'efficiency'], true)) {
                                $standardsByRating[$rating]['E'][] = (string) $standard->standard_text;
                            } elseif (in_array($dimension, ['t', 'timeliness'], true)) {
                                $standardsByRating[$rating]['T'][] = (string) $standard->standard_text;
                            }
                        }

                        foreach ($indicator->assignments as $assignment) {
                            $employeeId = (int) ($assignment->employee?->id ?? 0);
                            if ($employeeId <= 0) {
                                continue;
                            }

                            $byEmployee[$employeeId][] = [
                                'unit_work_plan_id' => (int) $uwp->id,
                                'performance_period_id' => (int) $uwp->performance_period_id,
                                'office_id' => (int) $uwp->office_id,
                                'uwp_function_id' => (int) $function->id,
                                'uwp_success_indicator_id' => (int) ($indicator->id ?? 0),
                                'output_title' => (string) ($mfo->title ?? ''),
                                'function_type' => strtolower((string) ($function->function_type ?? '')),
                                'indicator_text' => (string) ($indicator->indicator_text ?? ''),
                                'target_quantity' => $indicator->target_quantity ?? $mfo->target_quantity,
                                'target_timeline' => $indicator->target_timeline ?? $mfo->target_timeline,
                                'target_summary' => $this->buildTargetSummary(
                                    $indicator->target_quantity ?? $mfo->target_quantity,
                                    $indicator->target_timeline ?? $mfo->target_timeline
                                ),
                                'standards_payload' => $standardsByRating,
                            ];
                        }
                    }
                }
            }
        }

        if (empty($byEmployee)) {
            return;
        }

        foreach ($byEmployee as $employeeId => $items) {
            $existingIpcr = Ipcr::query()
                ->where('opcr_id', $opcr->id)
                ->where('employee_id', $employeeId)
                ->first();

            // Preserve already committed/locked/downstream IPCRs.
            // Do not reset them back to "for_commitment" during later OPCR/QAR actions.
            if ($existingIpcr) {
                $existingStatus = strtolower((string) $existingIpcr->status);
                $isCommittedOrBeyond = !is_null($existingIpcr->committed_at)
                    || !is_null($existingIpcr->locked_at)
                    || in_array($existingStatus, [
                        Ipcr::STATUS_COMMITTED,
                        Ipcr::STATUS_PENDING_PMT_CALIBRATION,
                        Ipcr::STATUS_RETURNED_BY_PMT,
                        Ipcr::STATUS_APPROVED_BY_PMT,
                        Ipcr::STATUS_ADJUSTED_BY_PMT,
                        Ipcr::STATUS_RELEASED_BY_PMT,
                    ], true);

                if ($isCommittedOrBeyond) {
                    continue;
                }
            }

            $updateData = [
                'status' => Ipcr::STATUS_FOR_COMMITMENT,
                // Always set performance_period_id — critical for scoring date windows
                'performance_period_id' => $opcr->performance_period_id
                    ?? ($items[0]['performance_period_id'] ?? $sourceUwps->first()?->performance_period_id),
            ];

            if ($hasUnitWorkPlanId) {
                $updateData['unit_work_plan_id'] = $items[0]['unit_work_plan_id'] ?? $sourceUwps->first()?->id;
            }
            if ($hasOfficeId) {
                $updateData['office_id'] = $opcr->office_id
                    ?? ($items[0]['office_id'] ?? $sourceUwps->first()?->office_id);
            }
            if ($hasGeneratedAt) {
                $updateData['generated_at'] = now();
            }

            // Keep uncommitted records in reviewable state.
            $updateData['committed_at'] = null;
            $updateData['locked_at'] = null;

            $ipcr = Ipcr::query()->updateOrCreate(
                [
                    'opcr_id' => $opcr->id,
                    'employee_id' => $employeeId,
                ],
                $updateData
            );

            DB::transaction(function () use ($ipcr, $items) {
                IpcrItem::query()
                    ->where('ipcr_id', $ipcr->id)
                    ->delete();

                foreach ($items as $item) {
                    IpcrItem::query()->create([
                        'ipcr_id' => $ipcr->id,
                        'uwp_function_id' => $item['uwp_function_id'] ?? null,
                        'uwp_success_indicator_id' => $item['uwp_success_indicator_id'] ?? null,
                        'output_title' => $item['output_title'],
                        'function_type' => $item['function_type'],
                        'indicator_text' => $item['indicator_text'],
                        'target_quantity' => $item['target_quantity'] ?? null,
                        'target_timeline' => $item['target_timeline'] ?? null,
                        'target_summary' => $item['target_summary'],
                        'standards_payload' => $item['standards_payload'],
                    ]);
                }
            });
        }
    }

    private function buildTargetSummary($targetQuantity, ?string $targetTimeline): string
    {
        $quantityText = $targetQuantity === null ? '' : trim((string) $targetQuantity);
        $timelineText = trim((string) ($targetTimeline ?? ''));

        return trim($quantityText . ' ' . $timelineText);
    }
}
