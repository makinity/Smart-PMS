<?php

namespace App\Http\Controllers\StageThree\Forms;

use App\Http\Controllers\StageOne\Forms\OpcrExcelExportController as BaseExport;
use App\Models\Opcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Services\PerformanceRatingService;
use Illuminate\Http\Request;

/**
 * Stage 3 OPCR Excel export — same layout as Stage 1 but with Q/E/T/A
 * columns populated from actual IPCR accomplishment ratings.
 */
class OpcrExcelExportController extends BaseExport
{
    public function export(Request $request)
    {
        $opcrId = $request->input('opcr_id');
        abort_unless($opcrId, 400, 'opcr_id is required.');

        $opcr = Opcr::with([
            'period', 'office',
            'uwps.uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->findOrFail($opcrId);

        $submission = OpcraAccomplishmentSubmission::where('office_id', $opcr->office_id)
            ->where('performance_period_id', $opcr->performance_period_id)
            ->first();

        $ratingService = app(PerformanceRatingService::class);
        $scoreMap = $ratingService->buildConsolidatedOfficeOutputRatings($opcr);

        $request->merge([
            '_accomplishment_scores' => $scoreMap,
            '_accomplishment_scores_by_indicator' => $scoreMap,
        ]);
        $request->merge([
            '_official_office_rating' => [
                'final_office_rating' => $submission?->final_office_rating,
                'computed_office_rating' => $submission?->computed_office_rating,
                'final_adjectival_rating' => $submission?->final_adjectival_rating,
            ],
        ]);

        return parent::export($request);
    }
}
