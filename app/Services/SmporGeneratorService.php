<?php

namespace App\Services;

use App\Models\QarHeader;
use App\Models\Smpor;
use App\Models\SmporItem;
use Illuminate\Support\Facades\DB;

class SmporGeneratorService
{
    public function generateFromApprovedQar(QarHeader $qarHeader, ?int $generatedByUserId = null): void
    {
        $approvedStatus = defined(QarHeader::class . '::STATUS_PMT_APPROVED')
            ? constant(QarHeader::class . '::STATUS_PMT_APPROVED')
            : 'pmt_approved';

        if ((string) $qarHeader->status !== (string) $approvedStatus) {
            return;
        }

        if (Smpor::query()->where('qar_header_id', $qarHeader->id)->exists()) {
            return;
        }

        $qarHeader->load(['mporLinks.mpor.employee']);

        $employeeTotals = [];
        $employeeMfoTotals = [];

        foreach ($qarHeader->mporLinks as $link) {
            $mpor = $link->mpor;
            if (!$mpor) {
                continue;
            }

            $entries = $mpor->ratedOrsEntriesForMonth()
                ->with(['monitoring', 'ipcrItem'])
                ->get();

            foreach ($entries as $entry) {
                $monitoring = $entry->monitoring;
                if (!$monitoring || is_null($monitoring->quality_rating) || is_null($monitoring->timeliness_rating)) {
                    continue;
                }

                $quantity = (float) ($entry->quantity ?? 0);
                if ($quantity <= 0) {
                    continue;
                }

                $employeeId = (int) ($mpor->employee_id ?? $entry->employee_id ?? 0);
                if ($employeeId <= 0) {
                    continue;
                }

                $mfoTitle = trim((string) ($entry->ipcrItem?->output_title ?? 'Unassigned MFO'));
                if ($mfoTitle === '') {
                    $mfoTitle = 'Unassigned MFO';
                }

                $qualityRating = (float) $monitoring->quality_rating;
                $timelinessRating = (float) $monitoring->timeliness_rating;
                $qualityPoints = $quantity * $qualityRating;
                $timelinessPoints = $quantity * $timelinessRating;

                if (!isset($employeeTotals[$employeeId])) {
                    $employeeTotals[$employeeId] = [
                        'qty' => 0.0,
                        'qPts' => 0.0,
                        'tPts' => 0.0,
                    ];
                }

                if (!isset($employeeMfoTotals[$employeeId])) {
                    $employeeMfoTotals[$employeeId] = [];
                }

                if (!isset($employeeMfoTotals[$employeeId][$mfoTitle])) {
                    $employeeMfoTotals[$employeeId][$mfoTitle] = [
                        'qty' => 0.0,
                        'qPts' => 0.0,
                        'tPts' => 0.0,
                    ];
                }

                $employeeTotals[$employeeId]['qty'] += $quantity;
                $employeeTotals[$employeeId]['qPts'] += $qualityPoints;
                $employeeTotals[$employeeId]['tPts'] += $timelinessPoints;

                $employeeMfoTotals[$employeeId][$mfoTitle]['qty'] += $quantity;
                $employeeMfoTotals[$employeeId][$mfoTitle]['qPts'] += $qualityPoints;
                $employeeMfoTotals[$employeeId][$mfoTitle]['tPts'] += $timelinessPoints;
            }
        }

        DB::transaction(function () use ($qarHeader, $generatedByUserId, $employeeTotals): void {
            if (Smpor::query()->where('qar_header_id', $qarHeader->id)->exists()) {
                return;
            }

            $smpor = Smpor::query()->create([
                'qar_header_id' => $qarHeader->id,
                'office_id' => $qarHeader->office_id,
                'performance_period_id' => $qarHeader->performance_period_id,
                'quarter_key' => (string) $qarHeader->quarter_key,
                'generated_at' => now(),
                'generated_by' => $generatedByUserId,
                'avg_quality' => null,
                'avg_timeliness' => null,
                'overall_score' => null,
                'adjectival_rating' => null,
            ]);

            $qualityAverages = [];
            $timelinessAverages = [];
            $overallAverages = [];

            foreach ($employeeTotals as $employeeId => $totals) {
                $qty = (float) ($totals['qty'] ?? 0);
                $qPts = (float) ($totals['qPts'] ?? 0);
                $tPts = (float) ($totals['tPts'] ?? 0);

                $qualityAvg = $qty > 0 ? $qPts / $qty : 0.0;
                $timelinessAvg = $qty > 0 ? $tPts / $qty : 0.0;
                $overallScore = ($qualityAvg + $timelinessAvg) / 2;

                SmporItem::query()->create([
                    'smpor_id' => $smpor->id,
                    'employee_id' => $employeeId,
                    'quality_avg' => $qualityAvg,
                    'timeliness_avg' => $timelinessAvg,
                    'overall_score' => $overallScore,
                    'adjectival_rating' => null,
                ]);

                if ($qty > 0) {
                    $qualityAverages[] = $qualityAvg;
                    $timelinessAverages[] = $timelinessAvg;
                    $overallAverages[] = $overallScore;
                }
            }

            if (!empty($qualityAverages)) {
                $smpor->avg_quality = array_sum($qualityAverages) / count($qualityAverages);
                $smpor->avg_timeliness = array_sum($timelinessAverages) / count($timelinessAverages);
                $smpor->overall_score = array_sum($overallAverages) / count($overallAverages);
                $smpor->save();
            }
        });
    }
}
