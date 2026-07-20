<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class TopPerformingEmployeeExportController extends Controller
{
    // ── Colour palette ────────────────────────────────────────────────────────
    private const BG_HDR    = 'FF1F3864'; // dark navy  – DETAILS header
    private const BG_SUBHDR = 'FF2F5597'; // mid blue   – column sub-headers
    private const FG_WHITE  = 'FFFFFFFF';
    private const FG_NAVY   = 'FF1F3864';
    private const FG_BLACK  = 'FF000000';
    private const BDR_BLACK = 'FF000000';
    private const BDR_GRAY  = 'FFB0B0B0';

    // Only these two ratings qualify
    private const TOP_RATINGS = ['Outstanding', 'Very Satisfactory'];

    // Column layout: A  B  C  D  E  F  G  H  I  J  K
    // Rank | Surname | Given Name | Middle Name | Name Ext | Designation | Office | Numerical | Adjective | Remarks
    private const LAST_COL = 'K';

    public function export(Request $request)
    {
        $period = PerformancePeriod::current();
        abort_unless($period, 404, 'No active performance period.');

        // ── Query: IPCRs with top ratings ─────────────────────────────────────
        // We need three sources:
        //   1. adjectival_rating on the IPCR itself
        //   2. pmt_adjusted_rating on the IPCR
        //   3. final_adjectival_rating on a released AccomplishmentSubmission
        $ipcrs = Ipcr::with([
            'employee:id,name',
            'employee.employee:id,user_id,first_name,middle_name,last_name,position,office_id',
            'employee.employee.office:id,name',
        ])
            ->where('performance_period_id', $period->id)
            ->where(function ($q) {
                $q->whereIn('pmt_adjusted_rating', self::TOP_RATINGS)
                  ->orWhereIn('adjectival_rating', self::TOP_RATINGS)
                  ->orWhereHas('accomplishmentSubmissions', fn ($sq) =>
                      $sq->where('status', 'released_by_pmt')
                         ->whereIn('final_adjectival_rating', self::TOP_RATINGS)
                  );
            })
            ->where(function ($q) {
                $q->where(fn ($q2) => $q2->whereNotNull('pmt_adjusted_score')->where('pmt_adjusted_score', '>', 0))
                  ->orWhere(fn ($q2) => $q2->whereNotNull('final_score')->where('final_score', '>', 0))
                  ->orWhereHas('accomplishmentSubmissions', fn ($sq) =>
                      $sq->where('status', 'released_by_pmt')->where('final_rating', '>', 0)
                  );
            })
            ->get();

        // Load released submissions
        $submissions = AccomplishmentSubmission::whereIn('ipcr_id', $ipcrs->pluck('id'))
            ->where('status', 'released_by_pmt')
            ->get(['ipcr_id', 'final_rating', 'final_adjectival_rating'])
            ->keyBy('ipcr_id');

        // Resolve score + rating for each IPCR
        $rows = $ipcrs->map(function (Ipcr $ipcr) use ($submissions) {
            $submission  = $submissions->get($ipcr->id);
            $systemScore = (float) $ipcr->final_score;

            if ($submission && $submission->final_rating > 0) {
                $score = round((float) $submission->final_rating, 2);
                $r     = $submission->final_adjectival_rating
                            ?: ($ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating);
            } elseif ($ipcr->pmt_adjusted_score > 0) {
                $score = round((float) $ipcr->pmt_adjusted_score, 2);
                $r     = $ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating;
            } else {
                $score = round($systemScore, 2);
                $r     = $ipcr->adjectival_rating ?? '';
            }

            if (! in_array($r, self::TOP_RATINGS, true) || $score <= 0) {
                return null;
            }

            $emp = $ipcr->employee?->employee; // Employee model
            $user = $ipcr->employee;           // User model

            return [
                'rating'      => $r,
                'score'       => $score,
                'last_name'   => $emp?->last_name   ?? '',
                'first_name'  => $emp?->first_name  ?? '',
                'middle_name' => $emp?->middle_name ?? '',
                'name_ext'    => '',                          // extension (Jr., Sr., etc.) — not stored separately
                'name'        => $user?->name ?? '—',        // fallback display
                'position'    => $emp?->position ?? ($user?->position ?? '—'),
                'office'      => $emp?->office?->name ?? '—',
            ];
        })
        ->filter()
        ->sort(function ($a, $b) {
            $tierA = array_search($a['rating'], self::TOP_RATINGS);
            $tierB = array_search($b['rating'], self::TOP_RATINGS);
            if ($tierA !== $tierB) return $tierA <=> $tierB;
            return $b['score'] <=> $a['score'];
        })
        ->values();

        // ── Build spreadsheet ─────────────────────────────────────────────────
        $ss = new Spreadsheet();
        $ws = $ss->getActiveSheet();
        $ws->setTitle('Top Performing Employees');

        // ── Page setup (landscape A4, narrow margins) ─────────────────────────
        $ws->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4)
            ->setFitToPage(true)
            ->setFitToWidth(1)
            ->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.5)->setBottom(0.5)->setLeft(0.4)->setRight(0.4)
            ->setHeader(0.2)->setFooter(0.2);
        $ws->getHeaderFooter()->setOddHeader('');

        // ── Column widths ──────────────────────────────────────────────────────
        $ws->getColumnDimension('A')->setWidth(6);   // Rank
        $ws->getColumnDimension('B')->setWidth(18);  // Surname
        $ws->getColumnDimension('C')->setWidth(18);  // Given Name
        $ws->getColumnDimension('D')->setWidth(14);  // Middle Name
        $ws->getColumnDimension('E')->setWidth(7);   // Name Ext
        $ws->getColumnDimension('F')->setWidth(24);  // Designation
        $ws->getColumnDimension('G')->setWidth(28);  // Office
        $ws->getColumnDimension('H')->setWidth(11);  // Numerical Rating
        $ws->getColumnDimension('I')->setWidth(11);  // Adjective Rating
        $ws->getColumnDimension('J')->setWidth(12);  // Remarks
        $ws->getColumnDimension('K')->setWidth(1);   // (buffer)

        $r = 1;

        // ── Logo (top left, rows 1-3) ─────────────────────────────────────────
        $logoPath = public_path('images/exports/pgds-logo.png');
        if (file_exists($logoPath)) {
            $logo = new Drawing();
            $logo->setPath($logoPath)
                ->setCoordinates('A1')
                ->setHeight(72)
                ->setOffsetX(8)
                ->setOffsetY(4)
                ->setWorksheet($ws);
        }

        // ── "THIS IS A SYSTEM GENERATED REPORT" top-right ────────────────────
        $ws->setCellValue('J1', 'THIS IS A SYSTEM GENERATED REPORT');
        $ws->getStyle('J1')->applyFromArray([
            'font'      => ['size' => 7, 'italic' => true, 'color' => ['argb' => 'FF777777']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ]);

        // ── Centered gov header (cols A–J, rows 1-6) ─────────────────────────
        $lastCol = self::LAST_COL;

        foreach ([
            ['Republic of the Philippines',                 false, 9,  14],
            ['Province of Davao del Sur',                   false, 9,  14],
            ['Performance Management Team (PMT)',           true,  10, 15],
            ['TOP PERFORMING EMPLOYEE REPORT',              true,  12, 18],
            ['For the Period of ' . $period->start_date->format('F Y') . ' - ' . $period->end_date->format('F Y'), false, 9, 14],
        ] as [$text, $bold, $sz, $rowH]) {
            $ws->mergeCells("A{$r}:J{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => $sz, 'color' => ['argb' => self::FG_NAVY]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight($rowH);
            $r++;
        }

        // ── Agency / Address / Period metadata ────────────────────────────────
        $r++;  // blank row spacer
        $ws->getRowDimension($r - 1)->setRowHeight(6);

        $metaRows = [
            ['Agency Name:',         'Provincial Government Office of Davao del Sur'],
            ['Address:',             'Matti, Digos City'],
            ['Performance Semester:',  $period->start_date->format('F Y') . ' - ' . $period->end_date->format('F Y')],
        ];

        foreach ($metaRows as [$label, $value]) {
            $ws->mergeCells("A{$r}:B{$r}");
            $ws->setCellValue("A{$r}", $label);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
            ]);
            $ws->mergeCells("C{$r}:J{$r}");
            $ws->setCellValue("C{$r}", $value);
            $ws->getStyle("C{$r}")->applyFromArray([
                'font'      => ['size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }

        $r++;  // blank spacer
        $ws->getRowDimension($r - 1)->setRowHeight(6);

        // ── DETAILS header ────────────────────────────────────────────────────
        $ws->mergeCells("A{$r}:J{$r}");
        $ws->setCellValue("A{$r}", 'DETAILS');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_HDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);
        $r++;

        // ── Column header row 1: spans ────────────────────────────────────────
        // Rank | Employee Name (B-E) | Designation | Office | Rating (H-I) | Remarks
        $ws->mergeCells("A{$r}:A" . ($r + 1));  // Rank spans 2 rows
        $ws->mergeCells("B{$r}:E{$r}");         // Employee Name spans B-E
        $ws->mergeCells("F{$r}:F" . ($r + 1));  // Designation spans 2 rows
        $ws->mergeCells("G{$r}:G" . ($r + 1));  // Office spans 2 rows
        $ws->mergeCells("H{$r}:I{$r}");         // Rating spans H-I
        $ws->mergeCells("J{$r}:J" . ($r + 1));  // Remarks spans 2 rows

        $ws->setCellValue("A{$r}", 'Rank');
        $ws->setCellValue("B{$r}", 'Employee Name');
        $ws->setCellValue("F{$r}", 'Designation');
        $ws->setCellValue("G{$r}", 'Office');
        $ws->setCellValue("H{$r}", 'Rating');
        $ws->setCellValue("J{$r}", 'Remarks');

        $ws->getStyle("A{$r}:J{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_SUBHDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(15);
        $r++;

        // ── Column header row 2: sub-headers ─────────────────────────────────
        $ws->setCellValue("B{$r}", 'Surname');
        $ws->setCellValue("C{$r}", 'Given Name');
        $ws->setCellValue("D{$r}", 'Middle Name');
        $ws->setCellValue("E{$r}", 'Name Ext.');
        $ws->setCellValue("H{$r}", 'Numerical');
        $ws->setCellValue("I{$r}", 'Adjective');

        $ws->getStyle("A{$r}:J{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_SUBHDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(15);
        $r++;

        // ── Data rows ─────────────────────────────────────────────────────────
        foreach ($rows as $i => $emp) {
            $rank = $i + 1;

            // If name parts are missing, parse from user->name (format: "First Last" or "Last, First")
            $surname = $emp['last_name'];
            $given   = $emp['first_name'];
            $middle  = $emp['middle_name'];

            if ($surname === '' && $given === '') {
                // Fallback: use full name in surname column
                $surname = $emp['name'];
            }

            // Abbreviate adjective rating for the export (VS / O)
            $adjAbbrev = match ($emp['rating']) {
                'Outstanding'       => 'O',
                'Very Satisfactory' => 'VS',
                default             => $emp['rating'],
            };

            $ws->setCellValue("A{$r}", $rank);
            $ws->setCellValue("B{$r}", $surname);
            $ws->setCellValue("C{$r}", $given);
            $ws->setCellValue("D{$r}", $middle);
            $ws->setCellValue("E{$r}", $emp['name_ext']);
            $ws->setCellValue("F{$r}", $emp['position']);
            $ws->setCellValue("G{$r}", $emp['office']);
            $ws->setCellValue("H{$r}", $emp['score']);
            $ws->setCellValue("I{$r}", $adjAbbrev);
            $ws->setCellValue("J{$r}", '');  // Remarks left blank

            // Alternating row bg
            $rowBg = ($i % 2 === 0) ? 'FFFFFFFF' : 'FFF5F9FF';

            $ws->getStyle("A{$r}:J{$r}")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $rowBg]],
                'font'      => ['size' => 8],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_GRAY]]],
            ]);

            // Center rank and rating columns
            $ws->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("H{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $ws->getStyle("I{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;
        }

        // ── Blank spacer row ──────────────────────────────────────────────────
        $r++;
        $ws->getRowDimension($r - 1)->setRowHeight(10);

        // ── Signature block ───────────────────────────────────────────────────
        // Three columns: Prepared by | Reviewed by | Approved by
        // Using columns A-C | D-F | G-J
        $sigLabels = ['Prepared by:', 'Reviewed by:', 'Approved by:'];

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->mergeCells("G{$r}:J{$r}");
        $ws->setCellValue("A{$r}", $sigLabels[0]);
        $ws->setCellValue("D{$r}", $sigLabels[1]);
        $ws->setCellValue("G{$r}", $sigLabels[2]);
        $ws->getStyle("A{$r}:J{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // Blank line for signature
        $ws->getRowDimension($r)->setRowHeight(24);
        $r++;

        // Name line (underlined)
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->mergeCells("G{$r}:J{$r}");
        $ws->setCellValue("A{$r}", '');
        $ws->setCellValue("D{$r}", '');
        $ws->setCellValue("G{$r}", '');
        $ws->getStyle("A{$r}:C{$r}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);
        $ws->getStyle("D{$r}:F{$r}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);
        $ws->getStyle("G{$r}:J{$r}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM);
        $ws->getStyle("A{$r}:J{$r}")->applyFromArray([
            'font'      => ['size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // Designation italic
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->mergeCells("G{$r}:J{$r}");
        $ws->setCellValue("A{$r}", '');
        $ws->setCellValue("D{$r}", '');
        $ws->setCellValue("G{$r}", '');
        $ws->getStyle("A{$r}:J{$r}")->applyFromArray([
            'font'      => ['size' => 8, 'italic' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // ── Stream to browser ─────────────────────────────────────────────────
        $periodLabel = $period->start_date->format('M_Y') . '_' . $period->end_date->format('M_Y');
        $filename    = "Top_Performing_Employees_{$periodLabel}.xlsx";

        $writer = new Xlsx($ss);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");
        header('Cache-Control: max-age=0');
        $writer->save('php://output');
        exit;
    }
}
