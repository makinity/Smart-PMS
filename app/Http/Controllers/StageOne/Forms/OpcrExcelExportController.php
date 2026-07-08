<?php

namespace App\Http\Controllers\StageOne\Forms;

use App\Http\Controllers\Controller;
use App\Models\Opcr;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class OpcrExcelExportController extends Controller
{
    // Column map (1-based index):
    // A=MFOs/PPAs  B=Success Indicators  C=Allotted Budget  D=Division/Accountable
    // E=6Mo Summary  F=Q  G=E  H=T  I=A  J=Remarks
    // K=Std5  L=Std4  M=Std3  N=Std2  O=Std1
    private const LAST_COL  = 'O';
    private const BG_NAVY   = 'FF1F3864';
    private const BG_STDHDR = 'FF2F5597';
    private const BG_CORE   = 'FFFFF2CC';
    private const BG_SUPP   = 'FFE2EFDA';
    private const BG_FOOT   = 'FFF2F2F2';
    private const BG_RATING = 'FFD9E1F2';
    private const FG_WHITE  = 'FFFFFFFF';
    private const FG_BLUE   = 'FF2F5597';
    private const BDR_BLACK = 'FF000000';
    private const BDR_GRAY  = 'FFB0B0B0';

    public function export(Request $request)
    {
        $opcrId = $request->query('opcr_id');
        abort_unless($opcrId, 400, 'opcr_id is required.');

        $opcr = Opcr::with([
            'period', 'office',
            'uwps.creator',
            'uwps.uwpFunctions.mfos.successIndicators.qetStandards',
            'uwps.uwpFunctions.mfos.successIndicators.assignments.employee',
        ])->findOrFail($opcrId);

        $user = auth()->user();
        abort_unless(in_array($user->role ?? $user->getRoleNames()->first(), ['dept-head', 'admin', 'pmt'], true), 403);

        $spreadsheet = new Spreadsheet();
        $ws = $spreadsheet->getActiveSheet()->setTitle('OPCR');

        // ── Column widths ──────────────────────────────────────────────────────
        foreach ([
            'A' => 28, 'B' => 40, 'C' => 12, 'D' => 28,
            'E' => 22, 'F' => 6,  'G' => 6,  'H' => 6,  'I' => 6,
            'J' => 16, 'K' => 28, 'L' => 28, 'M' => 28, 'N' => 28, 'O' => 28,
        ] as $col => $w) {
            $ws->getColumnDimension($col)->setWidth($w);
        }

        $r = 1;

        // ── Logo ───────────────────────────────────────────────────────────────
        $logoPath = public_path('images/exports/pgds-logo.png');
        if (file_exists($logoPath)) {
            $logo = new Drawing();
            $logo->setPath($logoPath)->setCoordinates('G1')
                ->setHeight(52)->setOffsetX(10)->setWorksheet($ws);
        }

        // ── Gov header ─────────────────────────────────────────────────────────
        $lastCol = self::LAST_COL;
        foreach ([
            ['Republic of the Philippines',              false, 9],
            ['PROVINCIAL GOVERNMENT OF DAVAO DEL SUR',  true,  11],
            ['Matti, Digos City',                        false, 9],
            ['OFFICE PERFORMANCE COMMITMENT AND REVIEW (OPCR)', true, 13],
        ] as [$text, $bold, $sz]) {
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => $sz, 'color' => ['argb' => self::FG_BLUE]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight($sz >= 13 ? 20 : 15);
            $r++;
        }

        // ── Commitment text ────────────────────────────────────────────────────
        $officeName = $opcr->office?->name ?? '___________________________';
        $period     = $opcr->period?->name  ?? '___________________________';
        $deptHead   = $user->name            ?? '___________________________';

        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}",
            "I, {$deptHead}, head of the {$officeName}, commit to deliver and agree to be rated on the attainment of the following targets in accordance with the indicated measures for the period {$period}."
        );
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['size' => 8, 'italic' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'wrapText' => true],
        ]);
        $ws->getRowDimension($r)->setRowHeight(28);
        $r++;

        // spacer
        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // ── Name box (right side) ──────────────────────────────────────────────
        $split = 'J'; // name box starts at col J
        $ws->mergeCells("A{$r}:I{$r}");
        $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
        $ws->setCellValue("{$split}{$r}", $deptHead);
        $ws->getStyle("{$split}{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);
        $r++;

        foreach ([['NAME', true], ['PGDH', false]] as [$label, $bold]) {
            $ws->mergeCells("A{$r}:I{$r}");
            $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
            $ws->setCellValue("{$split}{$r}", $label);
            $ws->getStyle("{$split}{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => 8],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight(13);
            $r++;
        }

        // Date line
        $ws->mergeCells("A{$r}:I{$r}");
        $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
        $ws->setCellValue("{$split}{$r}", 'Date: ___________________________');
        $ws->getStyle("{$split}{$r}")->applyFromArray([
            'font'      => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // ── Approved by block ──────────────────────────────────────────────────
        $ws->mergeCells("A{$r}:I{$r}");
        $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'Approved by:');
        $ws->setCellValue("{$split}{$r}", 'Date:');
        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
            'font'      => ['size' => 8],
            'borders'   => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        foreach (range(1, 3) as $_) {
            $ws->mergeCells("A{$r}:I{$r}");
            $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;
        }

        // Governor name
        $ws->mergeCells("A{$r}:I{$r}");
        $ws->mergeCells("{$split}{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'YVONNE R. CAGAS');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(15);
        $r++;

        $ws->mergeCells("A{$r}:I{$r}");
        $ws->setCellValue("A{$r}", 'Governor');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['size' => 8, 'color' => ['argb' => 'FF0070C0'], 'bold' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // spacer
        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->getRowDimension($r)->setRowHeight(6);
        $r++;

        // ── Column headers (3-row) ─────────────────────────────────────────────
        $h1 = $r; $h2 = $r + 1; $h3 = $r + 2;

        // Row 1: span headers
        $ws->mergeCells("A{$h1}:A{$h3}"); $ws->setCellValue("A{$h1}", 'MFOs/PPAs');      $this->hdr($ws, "A{$h1}:A{$h3}");
        $ws->mergeCells("B{$h1}:B{$h3}"); $ws->setCellValue("B{$h1}", 'Success Indicators'); $this->hdr($ws, "B{$h1}:B{$h3}");
        $ws->mergeCells("C{$h1}:C{$h3}"); $ws->setCellValue("C{$h1}", 'Allotted Budget'); $this->hdr($ws, "C{$h1}:C{$h3}");
        $ws->mergeCells("D{$h1}:D{$h3}"); $ws->setCellValue("D{$h1}", "Division/Ind.\nAccountable"); $this->hdr($ws, "D{$h1}:D{$h3}");
        $ws->mergeCells("E{$h1}:E{$h3}"); $ws->setCellValue("E{$h1}", "6 Months Summary of\nAccomplishment"); $this->hdr($ws, "E{$h1}:E{$h3}");

        $ws->mergeCells("F{$h1}:I{$h1}"); $ws->setCellValue("F{$h1}", 'Rating');
        $ws->getStyle("F{$h1}:I{$h1}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_RATING]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => $this->border(self::BDR_BLACK),
        ]);

        $ws->mergeCells("J{$h1}:J{$h3}"); $ws->setCellValue("J{$h1}", 'Remarks'); $this->hdr($ws, "J{$h1}:J{$h3}");

        $ws->mergeCells("K{$h1}:{$lastCol}{$h1}"); $ws->setCellValue("K{$h1}", 'Standards per Success Indicator');
        $ws->getStyle("K{$h1}:{$lastCol}{$h1}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_STDHDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => $this->border(self::BDR_BLACK),
        ]);

        // Row 2: Q E T A | Standards (span)
        $ws->mergeCells("F{$h2}:F{$h3}"); $ws->setCellValue("F{$h2}", 'Q'); $this->ratingHdr($ws, "F{$h2}:F{$h3}");
        $ws->mergeCells("G{$h2}:G{$h3}"); $ws->setCellValue("G{$h2}", 'E'); $this->ratingHdr($ws, "G{$h2}:G{$h3}");
        $ws->mergeCells("H{$h2}:H{$h3}"); $ws->setCellValue("H{$h2}", 'T'); $this->ratingHdr($ws, "H{$h2}:H{$h3}");
        $ws->mergeCells("I{$h2}:I{$h3}"); $ws->setCellValue("I{$h2}", 'A'); $this->ratingHdr($ws, "I{$h2}:I{$h3}");

        // Standards sub-header: 5 4 3 2 1
        foreach (['K' => '5', 'L' => '4', 'M' => '3', 'N' => '2', 'O' => '1'] as $col => $val) {
            $ws->mergeCells("{$col}{$h2}:{$col}{$h3}");
            $ws->setCellValue("{$col}{$h2}", $val);
            $ws->getStyle("{$col}{$h2}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => self::FG_WHITE]],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_STDHDR]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => $this->border(self::BDR_BLACK),
            ]);
        }

        $ws->getRowDimension($h1)->setRowHeight(16);
        $ws->getRowDimension($h2)->setRowHeight(16);
        $ws->getRowDimension($h3)->setRowHeight(16);
        $r = $h3 + 1;

        // ── Build merged output data from OPCR UWPs ────────────────────────────
        $byType      = [];
        $typeWeights = [];

        foreach ($opcr->uwps as $uwp) {
            foreach ($uwp->uwpFunctions as $fn) {
                $type   = strtolower($fn->function_type ?? 'core');
                $mfoKey = $fn->name;
                if (!isset($typeWeights[$type])) {
                    $typeWeights[$type] = (int) round((float) $fn->weight_percent);
                }
                if (!isset($byType[$type])) $byType[$type] = [];
                if (!isset($byType[$type][$mfoKey])) {
                    $byType[$type][$mfoKey] = [];
                }
                foreach ($fn->mfos as $mfo) {
                    $mfoTitle = $mfo->title;
                    if (!isset($byType[$type][$mfoKey][$mfoTitle])) {
                        $byType[$type][$mfoKey][$mfoTitle] = [];
                    }
                    foreach ($mfo->successIndicators as $si) {
                        $std = [5 => '', 4 => '', 3 => '', 2 => '', 1 => ''];
                    foreach ($si->qetStandards as $q) {
                        $prefix = strtoupper(substr($q->dimension, 0, 1)) . ': ';
                        $std[$q->rating] = ($std[$q->rating] ? $std[$q->rating] . "\n" : '') . $prefix . $q->standard_text;
                    }
                        // Use assigned employees, fallback to UWP creator
                        $assignedNames = $si->assignments
                            ->map(fn($a) => $a->employee?->name)
                            ->filter()
                            ->implode(', ');
                        $accountable = $assignedNames ?: ($uwp->creator?->name ?? '');

                        $byType[$type][$mfoKey][$mfoTitle][] = [
                            'indicator_id' => (int) $si->id,
                            'text'        => $si->indicator_text,
                            'budget'      => $si->allotted_budget,
                            'accountable' => $accountable,
                            'std'         => $std,
                        ];
                    }
                }
            }
        }

        // ── Write data rows ────────────────────────────────────────────────────
        foreach ($byType as $type => $fnGroups) {
            if (empty($fnGroups)) continue;

            // Get first function name for this type to use as section label
            $sectionLabel = array_key_first($fnGroups) . ' (' . ($typeWeights[$type] ?? 0) . '%)';
            $bg = $type === 'core' ? self::BG_CORE : self::BG_SUPP;

            // Section banner
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $sectionLabel);
            $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
                'borders'   => $this->border(self::BDR_BLACK),
            ]);
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;

            foreach ($fnGroups as $fnName => $mfos) {

                foreach ($mfos as $mfoTitle => $indicators) {
                    $mfoStart = $r;
                    foreach ($indicators as $idx => $si) {
                        $ws->setCellValue("A{$r}", $idx === 0 ? $mfoTitle : '');
                        $ws->setCellValue("B{$r}", $si['text']);
                        $ws->setCellValue("C{$r}", ($si['budget'] && $si['budget'] > 0) ? number_format($si['budget'], 2) : '');
                        $ws->setCellValue("D{$r}", $si['accountable']);
                        $ws->setCellValue("E{$r}", '');
                        $scores = $request->input('_accomplishment_scores_by_indicator.' . $si['indicator_id']);
                        if (!is_array($scores)) {
                            $scores = $request->input('_accomplishment_scores.' . $mfoTitle . '||' . $si['text'], ['q' => 0, 'e' => 0, 't' => 0, 'a' => 0]);
                        }
                        $ws->setCellValue("F{$r}", $scores['q'] ?? ''); $ws->setCellValue("G{$r}", $scores['e'] ?? '');
                        $ws->setCellValue("H{$r}", $scores['t'] ?? ''); $ws->setCellValue("I{$r}", $scores['a'] ?? '');
                        $ws->setCellValue("J{$r}", '');
                        $ws->setCellValue("K{$r}", $si['std'][5]);
                        $ws->setCellValue("L{$r}", $si['std'][4]);
                        $ws->setCellValue("M{$r}", $si['std'][3]);
                        $ws->setCellValue("N{$r}", $si['std'][2]);
                        $ws->setCellValue("O{$r}", $si['std'][1]);

                        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                            'font'      => ['size' => 8],
                            'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                            'borders'   => $this->border(self::BDR_GRAY),
                        ]);
                        if ($idx === 0) $ws->getStyle("A{$r}")->getFont()->setBold(true);

                        $maxLines = max(1,
                            (int) ceil(mb_strlen($si['text']) / 38),
                            ...array_map(fn($s) => $s ? substr_count($s, "\n") + 1 : 1, $si['std'])
                        );
                        $ws->getRowDimension($r)->setRowHeight(max(36, $maxLines * 13));
                        $r++;
                    }

                    if (count($indicators) > 1) {
                        $ws->mergeCells("A{$mfoStart}:A" . ($r - 1));
                        $ws->getStyle("A{$mfoStart}")->applyFromArray([
                            'font'      => ['bold' => true, 'size' => 8],
                            'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                            'borders'   => $this->border(self::BDR_GRAY),
                        ]);
                    }
                }
            }
        }

        // ── Footer summary rows ────────────────────────────────────────────────
        $accScores   = $request->input('_accomplishment_scores', []);
        $officialOfficeRating = $request->input('_official_office_rating', []);

        // Group A scores by function_type dynamically
        $typeScores = [];
        foreach ($accScores as $s) {
            $rating = $s['a'] ?? null;
            if (!is_numeric($rating) || (float) $rating <= 0) continue;
            $ft = strtolower(trim((string) ($s['function_type'] ?? 'core')));
            $typeScores[$ft][] = (float) $rating;
        }

        // Compute weighted average per type using accumulated weights
        $fnTypeWeights = [];
        foreach ($typeWeights as $ft => $w) {
            $fnTypeWeights[$ft] = (float) $w;
        }

        $typeWeightedRows = [];
        foreach ($fnTypeWeights as $ft => $weight) {
            $scores = $typeScores[$ft] ?? [];
            $avg = !empty($scores) ? round(array_sum($scores) / count($scores), 2) : 0.0;
            $weighted = round($avg * ($weight / 100), 2);
            $label = match($ft) {
                'core'      => 'Core Functions',
                'support'   => 'Support Functions',
                'strategic' => 'Strategic Functions',
                default     => ucfirst($ft) . ' Functions',
            };
            $typeWeightedRows[] = [
                'label'    => "Weighted Average Rating for {$label} ({$weight}%)",
                'weighted' => $weighted,
            ];
        }

        $officialOverall = is_numeric($officialOfficeRating['final_office_rating'] ?? null)
            ? round((float) $officialOfficeRating['final_office_rating'], 2)
            : round(array_sum(array_column($typeWeightedRows, 'weighted')), 2);
        $officialAdjectival = trim((string) ($officialOfficeRating['final_adjectival_rating'] ?? ''));
        if ($officialAdjectival === '') {
            $officialAdjectival = $officialOverall >= 5.0 ? 'Outstanding'
                : ($officialOverall >= 4.0 ? 'Very Satisfactory'
                : ($officialOverall >= 3.0 ? 'Satisfactory'
                : ($officialOverall >= 2.0 ? 'Unsatisfactory' : 'Poor')));
        }

        $footerRows = array_merge(
            array_map(fn($r) => ['label' => $r['label'], 'value' => $r['weighted'], 'bold' => true], $typeWeightedRows),
            [
                ['label' => 'OVERALL RATING',    'value' => $officialOverall,    'bold' => true],
                ['label' => 'ADJECTIVAL RATING', 'value' => $officialAdjectival, 'bold' => false],
            ]
        );

        foreach ($footerRows as $idx => $row) {
            $value = $row['value'];
            $ws->mergeCells("A{$r}:E{$r}");
            $ws->mergeCells("F{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $row['label']);
            if ($value !== null && $value !== '') $ws->setCellValue("F{$r}", $value);
            $ws->getStyle("A{$r}:E{$r}")->applyFromArray([
                'font'      => ['size' => 8, 'italic' => true],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => $this->border(self::BDR_BLACK),
            ]);
            $ws->getStyle("F{$r}:{$lastCol}{$r}")->applyFromArray([
                'font'      => ['bold' => $row['bold'], 'size' => 9],
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
                'borders' => $this->border(self::BDR_BLACK),
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }

        // ── Signature block ────────────────────────────────────────────────────
        $sigStyle = [
            'font'      => ['bold' => true, 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOT]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => $this->border(self::BDR_BLACK),
        ];

        // Header row
        $ws->mergeCells("A{$r}:C{$r}"); $ws->setCellValue("A{$r}", 'Discussed with and Agreed by:');
        $ws->setCellValue("D{$r}", 'Date');
        $ws->mergeCells("E{$r}:I{$r}"); $ws->setCellValue("E{$r}", 'Assessed by:');
        $ws->setCellValue("J{$r}", 'Date');
        $ws->mergeCells("K{$r}:{$lastCol}{$r}"); $ws->setCellValue("K{$r}", 'Final Rating Approved by:');
        foreach (["A{$r}:C{$r}", "D{$r}", "E{$r}:I{$r}", "J{$r}", "K{$r}:{$lastCol}{$r}"] as $rng) {
            $ws->getStyle($rng)->applyFromArray($sigStyle);
        }
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // Blank rows
        foreach (range(1, 4) as $_) {
            $ws->mergeCells("A{$r}:C{$r}"); $ws->mergeCells("E{$r}:I{$r}"); $ws->mergeCells("K{$r}:{$lastCol}{$r}");
            foreach (["A{$r}:C{$r}", "D{$r}", "E{$r}:I{$r}", "J{$r}", "K{$r}:{$lastCol}{$r}"] as $rng) {
                $ws->getStyle($rng)->applyFromArray(['borders' => $this->border(self::BDR_BLACK)]);
            }
            $ws->getRowDimension($r)->setRowHeight(18);
            $r++;
        }

        // Role labels
        $ws->mergeCells("A{$r}:C{$r}"); $ws->mergeCells("E{$r}:I{$r}"); $ws->mergeCells("K{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'PGDH');
        $ws->setCellValue("E{$r}", 'PMT Chairperson');
        $ws->setCellValue("K{$r}", 'Governor');
        foreach (["A{$r}:C{$r}", "D{$r}", "E{$r}:I{$r}", "J{$r}", "K{$r}:{$lastCol}{$r}"] as $rng) {
            $ws->getStyle($rng)->applyFromArray($sigStyle);
        }
        $ws->getRowDimension($r)->setRowHeight(14);

        // ── Page setup ─────────────────────────────────────────────────────────
        $ws->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A3)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.5)->setBottom(0.5)->setLeft(0.4)->setRight(0.4);

        $safe = preg_replace('/[^A-Za-z0-9_\-\.]/', '_', "OPCR_{$officeName}_{$period}.xlsx");
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(fn() => $writer->save('php://output'), $safe, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    private function hdr(Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_NAVY]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => $this->border(self::BDR_BLACK),
        ]);
    }

    private function ratingHdr(Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF000000']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_RATING]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => $this->border(self::BDR_BLACK),
        ]);
    }

    private function border(string $color = self::BDR_BLACK): array
    {
        return ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => $color]]];
    }
}
