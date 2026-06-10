<?php

namespace App\Http\Controllers\StageOne\Forms;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class IpcrExcelExportController extends Controller
{
    // Columns: A=Output  B=Success Indicators  C=6Mo Summary  D=Q  E=E  F=T  G=A  H=Remarks  I=5  J=4  K=3  L=2  M=1
    private const LAST_COL = 'M';

    private const BG_NAVY = 'FF1F3864';

    private const BG_STDHDR = 'FF2F5597';

    private const BG_CORE = 'FFFFF2CC';

    private const BG_STRAT = 'FFE8E0F0';

    private const BG_SUPP = 'FFE2EFDA';

    private const BG_FOOT = 'FFF2F2F2';

    private const FG_WHITE = 'FFFFFFFF';

    private const FG_BLUE = 'FF2F5597';

    private const BDR_BLACK = 'FF000000';

    private const BDR_GRAY = 'FFB0B0B0';

    public function export(Request $request)
    {
        $employee = auth()->user();

        $period = PerformancePeriod::current();
        abort_unless($period, 404, 'No active performance period.');

        $ipcr = Ipcr::with([
            'employee.office',
            'period',
            'items.indicator.qetStandards',
            'items.indicator.uwpMfo.uwpFunction',
        ])
            ->where('employee_id', $employee->id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        // Pre-compute ratings for all items keyed by ipcr_item_id
        $ratingsMap = [];
        $summaryMap = [];
        foreach ($ipcr->items as $item) {
            $entries = OrsEntry::where('ipcr_item_id', $item->id)
                ->where('status', 'rated')->where('quantity', '>', 0)
                ->whereBetween('work_date', [$period->start_date, $period->end_date])
                ->with('monitoring')->get();

            if ($entries->isEmpty()) {
                $ratingsMap[$item->id] = ['Q' => null, 'E' => null, 'T' => null, 'A' => null];
                $summaryMap[$item->id] = '';

                continue;
            }
            $totalQty = $entries->sum('quantity');
            $qualPts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->quality_rating ?? 0));
            $timePts = $entries->sum(fn ($e) => $e->quantity * ($e->monitoring->first()?->timeliness_rating ?? 0));
            $Q = $totalQty > 0 ? round($qualPts / $totalQty, 2) : null;
            $T = $totalQty > 0 ? round($timePts / $totalQty, 2) : null;
            $target = is_numeric($item->indicator?->target_quantity) ? (float) $item->indicator->target_quantity : null;
            $E = ($target && $target > 0) ? min(5.00, round(($totalQty / $target) * 5, 2)) : $Q;
            $A = ($Q !== null && $T !== null) ? round(($Q + $E + $T) / 3, 2) : null;

            $ratingsMap[$item->id] = compact('Q', 'E', 'T', 'A');
            $summaryMap[$item->id] = "Total Qty: {$totalQty}".
                ($item->indicator?->target_quantity ? " / Target: {$item->indicator->target_quantity}" : '');
        }

        $spreadsheet = new Spreadsheet;
        $ws = $spreadsheet->getActiveSheet()->setTitle('IPCR');

        // ── Column widths ──────────────────────────────────────────────────────
        foreach ([
            'A' => 30, 'B' => 42, 'C' => 22,
            'D' => 5,  'E' => 5,  'F' => 5,  'G' => 5,
            'H' => 16,
            'I' => 26, 'J' => 26, 'K' => 26, 'L' => 26, 'M' => 26,
        ] as $col => $w) {
            $ws->getColumnDimension($col)->setWidth($w);
        }

        $r = 1;
        $lastCol = self::LAST_COL;

        // ── Government header ──────────────────────────────────────────────────
        foreach ([
            ['Republic of the Philippines', false, 9],
            ['PROVINCIAL GOVERNMENT OF DAVAO DEL SUR', true, 11],
            ['Matti, Digos City', false, 9],
            ['INDIVIDUAL PERFORMANCE COMMITMENT AND REVIEW (IPCR)', true, 13],
        ] as [$text, $bold, $sz]) {
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font' => ['bold' => $bold, 'size' => $sz, 'color' => ['argb' => self::FG_BLUE]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight($sz >= 13 ? 20 : 15);
            $r++;
        }

        // ── Commitment text ────────────────────────────────────────────────────
        $empName = $ipcr->employee->name ?? '_______________';
        $officeName = $ipcr->employee->office?->name ?? '_______________';
        $periodName = $ipcr->period?->name ?? '_______________';

        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}",
            "I, {$empName}, of the {$officeName}, commit to deliver and agree to be rated on the attainment of the following targets in accordance with the indicated measures for the period {$periodName}."
        );
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['size' => 8, 'italic' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'wrapText' => true],
        ]);
        $ws->getRowDimension($r)->setRowHeight(28);
        $r++;

        // ── Signature / date block ─────────────────────────────────────────────
        $split = 'H';
        // Blank signature line (employee)
        $ws->mergeCells("A{$r}:G{$r}");
        $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", $empName);
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->setCellValue("{$split}{$r}", 'Date: ___________________________');
        $ws->getStyle("{$split}{$r}")->applyFromArray([
            'font' => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getRowDimension($r)->setRowHeight(18);
        $r++;

        // Designation label
        $ws->mergeCells("A{$r}:G{$r}");
        $ws->setCellValue("A{$r}", 'Designation');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['size' => 8, 'color' => ['argb' => 'FF0070C0'], 'bold' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // Reviewed / Approved headers
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'Reviewed by:');
        $ws->setCellValue("D{$r}", 'Approved by:');
        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray(['font' => ['size' => 8]]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        foreach (range(1, 3) as $_) {
            $ws->mergeCells("A{$r}:C{$r}");
            $ws->mergeCells("D{$r}:{$lastCol}{$r}");
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;
        }

        // Reviewer / Approver names
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", '___________________________');
        $ws->setCellValue("D{$r}", '___________________________');
        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
            'font' => ['size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(15);
        $r++;

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'Division Head');
        $ws->setCellValue("D{$r}", 'PGDH');
        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 8, 'color' => ['argb' => 'FF0070C0']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // spacer
        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->getRowDimension($r)->setRowHeight(5);
        $r++;

        // ── Column headers (2-row) ─────────────────────────────────────────────
        $h1 = $r;
        $h2 = $r + 1;

        $ws->mergeCells("A{$h1}:A{$h2}");
        $ws->setCellValue("A{$h1}", 'OUTPUT');
        $this->hdr($ws, "A{$h1}:A{$h2}");
        $ws->mergeCells("B{$h1}:B{$h2}");
        $ws->setCellValue("B{$h1}", "Success Indicators\n(Measure + Target)");
        $this->hdr($ws, "B{$h1}:B{$h2}");
        $ws->mergeCells("C{$h1}:C{$h2}");
        $ws->setCellValue("C{$h1}", "6 Months Summary\nof Accomplishment");
        $this->hdr($ws, "C{$h1}:C{$h2}");

        $ws->mergeCells("D{$h1}:G{$h1}");
        $ws->setCellValue("D{$h1}", 'Rating');
        $ws->getStyle("D{$h1}:G{$h1}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFD9E1F2']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => $this->border(),
        ]);
        foreach (['D' => 'Q', 'E' => 'E', 'F' => 'T', 'G' => 'A'] as $col => $lbl) {
            $ws->setCellValue("{$col}{$h2}", $lbl);
            $ws->getStyle("{$col}{$h2}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 9],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFD9E1F2']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => $this->border(),
            ]);
        }

        $ws->mergeCells("H{$h1}:H{$h2}");
        $ws->setCellValue("H{$h1}", 'Remarks');
        $this->hdr($ws, "H{$h1}:H{$h2}");

        $ws->mergeCells("I{$h1}:{$lastCol}{$h1}");
        $ws->setCellValue("I{$h1}", 'Standards per Success Indicator');
        $ws->getStyle("I{$h1}:{$lastCol}{$h1}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_STDHDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => $this->border(),
        ]);
        foreach (['I' => '5', 'J' => '4', 'K' => '3', 'L' => '2', 'M' => '1'] as $col => $val) {
            $ws->setCellValue("{$col}{$h2}", $val);
            $ws->getStyle("{$col}{$h2}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 10, 'color' => ['argb' => self::FG_WHITE]],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_STDHDR]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => $this->border(),
            ]);
        }

        $ws->getRowDimension($h1)->setRowHeight(16);
        $ws->getRowDimension($h2)->setRowHeight(16);
        $r = $h2 + 1;

        // ── Build grouped data ─────────────────────────────────────────────────
        $byType = [];
        $typeWeights = [];
        foreach ($ipcr->items as $item) {
            $si = $item->indicator;
            $mfo = $si->uwpMfo;
            $fn = $mfo->uwpFunction;

            $type = strtolower($fn->function_type ?? 'core');
            $fnName = $fn->name;
            $mfoName = $mfo->title;

            if (! isset($typeWeights[$type])) {
                $typeWeights[$type] = (int) round((float) $fn->weight_percent);
            }

            $std = [5 => '', 4 => '', 3 => '', 2 => '', 1 => ''];
            foreach ($si->qetStandards as $q) {
                $prefix = strtoupper(substr($q->dimension, 0, 1)).': ';
                $std[$q->rating] = ($std[$q->rating] ? $std[$q->rating]."\n" : '').$prefix.$q->standard_text;
            }

            $target = trim(implode(' ', array_filter([$si->target_quantity, $si->target_timeline])));

            $byType[$type][$fnName][$mfoName][] = [
                'id' => $item->id,
                'text' => $si->indicator_text,
                'target' => $target,
                'std' => $std,
            ];
        }

        // ── Write data rows ────────────────────────────────────────────────────
        $sections = [
            'core' => ['A. CORE FUNCTIONS',      self::BG_CORE],
            'strategic' => ['B. STRATEGIC OBJECTIVES', self::BG_STRAT],
            'support' => ['C. SUPPORT FUNCTIONS',   self::BG_SUPP],
        ];

        foreach ($sections as $type => [$label, $bg]) {
            if (empty($byType[$type])) {
                continue;
            }

            // Section banner
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $label);
            $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 9],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
                'borders' => $this->border(),
            ]);
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;

            foreach ($byType[$type] as $fnName => $mfos) {
                foreach ($mfos as $mfoName => $indicators) {
                    $mfoStartRow = $r;
                    foreach ($indicators as $idx => $si) {
                        if ($idx === 0) {
                            $ws->setCellValue("A{$r}", $mfoName);
                        }
                        $ws->setCellValue("B{$r}", $si['text']);
                        $r_ratings = $ratingsMap[$si['id']] ?? ['Q' => null, 'E' => null, 'T' => null, 'A' => null];
                        $ws->setCellValue("C{$r}", $summaryMap[$si['id']] ?? '');
                        $ws->setCellValue("D{$r}", $r_ratings['Q'] ?? '');
                        $ws->setCellValue("E{$r}", $r_ratings['E'] ?? '');
                        $ws->setCellValue("F{$r}", $r_ratings['T'] ?? '');
                        $ws->setCellValue("G{$r}", $r_ratings['A'] ?? '');
                        $ws->setCellValue("H{$r}", '');
                        $ws->setCellValue("I{$r}", $si['std'][5]);
                        $ws->setCellValue("J{$r}", $si['std'][4]);
                        $ws->setCellValue("K{$r}", $si['std'][3]);
                        $ws->setCellValue("L{$r}", $si['std'][2]);
                        $ws->setCellValue("M{$r}", $si['std'][1]);

                        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                            'font' => ['size' => 8],
                            'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                            'borders' => $this->border(self::BDR_GRAY),
                        ]);
                        $ws->getStyle("D{$r}:G{$r}")->applyFromArray([
                            'font' => ['bold' => true, 'size' => 9],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                        ]);
                        // Center-align rating cells
                        $ws->getStyle("D{$r}:G{$r}")->applyFromArray([
                            'font' => ['bold' => true, 'size' => 9],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                        ]);

                        $maxLines = max(1,
                            (int) ceil(mb_strlen($si['text']) / 38),
                            ...array_map(fn ($s) => $s ? substr_count($s, "\n") + 1 : 1, $si['std'])
                        );
                        $ws->getRowDimension($r)->setRowHeight(max(36, $maxLines * 13));
                        $r++;
                    }

                    // Merge col A vertically across all indicator rows for this MFO
                    if (count($indicators) > 1) {
                        $ws->mergeCells("A{$mfoStartRow}:A".($r - 1));
                    }
                    $ws->getStyle("A{$mfoStartRow}")->applyFromArray([
                        'font' => ['bold' => true, 'size' => 8],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                        'borders' => $this->border(self::BDR_GRAY),
                    ]);
                }
            }
        }

        // ── Footer rows ────────────────────────────────────────────────────────
        // ── Compute per-type weighted averages on-the-fly ──────────────────────
        $typeScores = [];
        foreach ($ipcr->items as $item) {
            $fn = $item->indicator?->uwpMfo?->uwpFunction;
            $type = strtolower($fn->function_type ?? 'core');
            $A = $ratingsMap[$item->id]['A'] ?? null;
            if ($A !== null) {
                $typeScores[$type][] = (float) $A;
            }
        }
        $typeWeightedScores = [];
        foreach ($typeScores as $type => $aRatings) {
            $avg = array_sum($aRatings) / count($aRatings);
            $weight = ($typeWeights[$type] ?? 0) / 100;
            $typeWeightedScores[$type] = round($avg * $weight, 2);
        }

        // Overall / adjectival rating: prefer the PMT-released official rating
        // (adjusted if calibrated, otherwise the system score the PMT released),
        // falling back to the IPCR's own system-computed score when not yet released.
        $submission = AccomplishmentSubmission::where('employee_id', $ipcr->employee_id)
            ->where('performance_period_id', $ipcr->performance_period_id)
            ->where('status', 'released_by_pmt')
            ->latest()
            ->first();

        $overallScore = $submission?->final_rating
            ?? $ipcr->pmt_adjusted_score
            ?? $ipcr->final_score;
        $overallAdjectival = $submission?->final_adjectival_rating
            ?? $ipcr->pmt_adjusted_rating
            ?? $ipcr->adjectival_rating;

        $footLabels = [];
        if (! empty($byType['core'])) {
            $footLabels[] = ['Weighted Average Rating for Core Functions ('.($typeWeights['core'] ?? 0).'%)', isset($typeWeightedScores['core']) ? number_format($typeWeightedScores['core'], 2) : ''];
        }
        if (! empty($byType['strategic'])) {
            $footLabels[] = ['Weighted Average Rating for Strategic Objectives ('.($typeWeights['strategic'] ?? 0).'%)', isset($typeWeightedScores['strategic']) ? number_format($typeWeightedScores['strategic'], 2) : ''];
        }
        if (! empty($byType['support'])) {
            $footLabels[] = ['Weighted Average Rating for Support Functions ('.($typeWeights['support'] ?? 0).'%)', isset($typeWeightedScores['support']) ? number_format($typeWeightedScores['support'], 2) : ''];
        }
        $footLabels[] = ['OVERALL RATING',    $overallScore !== null ? number_format((float) $overallScore, 2) : ''];
        $footLabels[] = ['ADJECTIVAL RATING', $overallAdjectival ?? ''];

        foreach ($footLabels as [$label, $value]) {
            $ws->mergeCells("A{$r}:C{$r}");
            $ws->mergeCells("D{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $label);
            $ws->setCellValue("D{$r}", $value);
            $ws->getStyle("D{$r}:{$lastCol}{$r}")->applyFromArray([
                'font' => ['bold' => true, 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getStyle("A{$r}:C{$r}")->applyFromArray([
                'font' => ['size' => 8, 'italic' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => $this->border(),
            ]);
            $ws->getStyle("D{$r}:{$lastCol}{$r}")->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
                'borders' => $this->border(),
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }

        // Comments row
        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'Comments and Recommendations for Development Purposes');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 8, 'color' => ['argb' => 'FFFF0000']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
            'borders' => $this->border(),
        ]);
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        foreach (range(1, 3) as $_) {
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->getStyle("A{$r}")->applyFromArray(['borders' => $this->border()]);
            $ws->getRowDimension($r)->setRowHeight(20);
            $r++;
        }

        // ── Final signature block ──────────────────────────────────────────────
        $sigStyle = [
            'font' => ['bold' => true, 'size' => 8],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => $this->border(),
        ];

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->setCellValue("A{$r}", 'Discussed with and Agreed by:');
        $ws->setCellValue("D{$r}", 'Date');
        $ws->mergeCells("E{$r}:I{$r}");
        $ws->setCellValue("E{$r}", 'Assessed by:');
        $ws->setCellValue("J{$r}", 'Date');
        $ws->mergeCells("K{$r}:{$lastCol}{$r}");
        $ws->setCellValue("K{$r}", 'Approved by:');
        foreach (["A{$r}:C{$r}", "D{$r}", "E{$r}:I{$r}", "J{$r}", "K{$r}:{$lastCol}{$r}"] as $rng) {
            $ws->getStyle($rng)->applyFromArray($sigStyle);
        }
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        foreach (range(1, 4) as $_) {
            $ws->mergeCells("A{$r}:C{$r}");
            $ws->mergeCells("E{$r}:I{$r}");
            $ws->mergeCells("K{$r}:{$lastCol}{$r}");
            foreach (["A{$r}:C{$r}", "D{$r}", "E{$r}:I{$r}", "J{$r}", "K{$r}:{$lastCol}{$r}"] as $rng) {
                $ws->getStyle($rng)->applyFromArray(['borders' => $this->border()]);
            }
            $ws->getRowDimension($r)->setRowHeight(18);
            $r++;
        }

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("E{$r}:I{$r}");
        $ws->mergeCells("K{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'Designation');
        $ws->setCellValue("E{$r}", 'Division Head');
        $ws->setCellValue("K{$r}", 'PGDH');
        foreach (["A{$r}:C{$r}", "D{$r}", "E{$r}:I{$r}", "J{$r}", "K{$r}:{$lastCol}{$r}"] as $rng) {
            $ws->getStyle($rng)->applyFromArray($sigStyle);
        }
        $ws->getRowDimension($r)->setRowHeight(14);

        // ── Page setup ─────────────────────────────────────────────────────────
        $ws->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(PageSetup::PAPERSIZE_A3)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.5)->setBottom(0.5)->setLeft(0.4)->setRight(0.4);

        $safe = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', "IPCR_{$empName}_{$periodName}.xlsx");
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(fn () => $writer->save('php://output'), $safe, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    private function hdr(Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font' => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_NAVY]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => $this->border(),
        ]);
    }

    private function border(string $color = self::BDR_BLACK): array
    {
        return ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => $color]]];
    }
}
