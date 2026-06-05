<?php

namespace App\Http\Controllers\StageOne\Forms;

use App\Http\Controllers\Controller;
use App\Models\UnitWorkPlan;
use App\Services\UwpExcelPayloadService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class UwpExcelExportController extends Controller
{
    // Columns A–H (1-indexed)
    private const C_MFO    = 'A';
    private const C_SI     = 'B';
    private const C_BUDGET = 'C';
    private const C_S5     = 'D';
    private const C_S4     = 'E';
    private const C_S3     = 'F';
    private const C_S2     = 'G';
    private const C_S1     = 'H';
    private const LAST_COL = 'H';

    // ARGB colors
    private const BG_NAVY    = 'FF1F3864';
    private const FG_WHITE   = 'FFFFFFFF';
    private const BG_STDHDR  = 'FF2F5597'; // dark blue for standards header band
    private const BG_CORE    = 'FFFFF2CC'; // light yellow
    private const BG_SUPPORT = 'FFE2EFDA'; // light green
    private const BG_FOOTER  = 'FFF2F2F2';
    private const FG_BLUE    = 'FF2F5597'; // gov header text
    private const BDR_BLACK  = 'FF000000';
    private const BDR_GRAY   = 'FFB0B0B0';

    public function export(Request $request)
    {
        $uwpId = $request->query('uwp_id');
        abort_unless($uwpId, 400, 'uwp_id is required.');

        $uwp  = UnitWorkPlan::findOrFail($uwpId);
        $user = auth()->user();
        $role = $user->getRoleNames()->first() ?? $user->role;
        abort_unless(in_array($role, ['supervisor', 'dept-head'], true), 403);

        $payload   = (new UwpExcelPayloadService())->build($uwp);
        $uwpData   = $payload['uwp'];
        $standards = $payload['standards'];

        $spreadsheet = new Spreadsheet();
        $ws = $spreadsheet->getActiveSheet();
        $ws->setTitle('UWP');

        // ── Column widths ──────────────────────────────────────────────────────
        $ws->getColumnDimension('A')->setWidth(30);
        $ws->getColumnDimension('B')->setWidth(44);
        $ws->getColumnDimension('C')->setWidth(14);
        $ws->getColumnDimension('D')->setWidth(34);
        $ws->getColumnDimension('E')->setWidth(34);
        $ws->getColumnDimension('F')->setWidth(34);
        $ws->getColumnDimension('G')->setWidth(34);
        $ws->getColumnDimension('H')->setWidth(34);

        $r = 1; // current row counter

        // ── Optional logo ──────────────────────────────────────────────────────
        $logoPath = public_path('images/exports/pgds-logo.png');
        if (file_exists($logoPath)) {
            $logo = new Drawing();
            $logo->setPath($logoPath)->setCoordinates('D1')
                ->setHeight(52)->setOffsetX(55)->setWorksheet($ws);
        }

        // ── Government header (rows 1–4) ───────────────────────────────────────
        foreach ([
            ['Republic of the Philippines',              false, 9],
            ['PROVINCIAL GOVERNMENT OF DAVAO DEL SUR',  true,  11],
            ['Matti, Digos City',                        false, 9],
            ['UNIT WORK PLAN (UWP)',                     true,  13],
        ] as [$text, $bold, $size]) {
            $ws->mergeCells("A{$r}:H{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => $size, 'color' => ['argb' => self::FG_BLUE]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                                'vertical'   => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight($size === 13 ? 20 : 15);
            $r++;
        }

        // ── Spacer ─────────────────────────────────────────────────────────────
        $ws->mergeCells("A{$r}:H{$r}");
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // ── Commitment text ────────────────────────────────────────────────────
        $supervisor = $uwpData['supervisor'] ?? '___________________________';
        $office     = $uwpData['office']     ?? '___________________________';
        $period     = $uwpData['period']     ?? '___________________________';
        $ws->mergeCells("A{$r}:H{$r}");
        $ws->setCellValue("A{$r}",
            "I, {$supervisor}, head of the {$office}, commit to deliver and agree to be rated on the attainment of the following targets in accordance with the indicated measures for the period {$period}."
        );
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['size' => 8, 'italic' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'wrapText' => true],
        ]);
        $ws->getRowDimension($r)->setRowHeight(26);
        $r++;

        // ── Spacer ─────────────────────────────────────────────────────────────
        $ws->mergeCells("A{$r}:H{$r}");
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // ── Ratee name box (top-right) ─────────────────────────────────────────
        // Name (underlined, centered, E–H)
        $ws->mergeCells("A{$r}:D{$r}");
        $ws->mergeCells("E{$r}:H{$r}");
        $ws->setCellValue("E{$r}", $supervisor);
        $ws->getStyle("E{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM,
                                         'color'       => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);
        $r++;

        // "NAME" label
        $ws->mergeCells("A{$r}:D{$r}");
        $ws->mergeCells("E{$r}:H{$r}");
        $ws->setCellValue("E{$r}", 'NAME');
        $ws->getStyle("E{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // "PGDH" label | "Date:" right side
        $ws->mergeCells("A{$r}:D{$r}");
        $ws->mergeCells("E{$r}:H{$r}");
        $ws->setCellValue("A{$r}", 'PGDH');
        $ws->setCellValue("E{$r}", 'Date: ___________________________________');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getStyle("E{$r}")->applyFromArray([
            'font'      => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // Approved-by area (label row)
        $ws->mergeCells("A{$r}:H{$r}");
        $ws->setCellValue("A{$r}", 'Approved by:');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // Signature blank rows (3)
        foreach (range(1, 3) as $_) {
            $ws->mergeCells("A{$r}:H{$r}");
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;
        }

        // Dept-head name (underlined)
        $ws->mergeCells("A{$r}:D{$r}");
        $deptHead = $uwpData['dept_head'] ?? '';
        $ws->setCellValue("A{$r}", $deptHead);
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM,
                                         'color'       => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->mergeCells("E{$r}:H{$r}");
        $ws->getRowDimension($r)->setRowHeight(15);
        $r++;

        // Spacer
        $ws->mergeCells("A{$r}:H{$r}");
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // ── Column header (2-row) ──────────────────────────────────────────────
        $hdr1 = $r;
        $hdr2 = $r + 1;

        // Row 1: MFOs | SI | Budget (span 2 rows each) | "Standards per Success Indicator" (D–H)
        $ws->mergeCells("A{$hdr1}:A{$hdr2}");
        $ws->setCellValue("A{$hdr1}", 'MFOs/PPAs');
        $this->colHdr($ws, "A{$hdr1}:A{$hdr2}");

        $ws->mergeCells("B{$hdr1}:B{$hdr2}");
        $ws->setCellValue("B{$hdr1}", 'Success Indicators');
        $this->colHdr($ws, "B{$hdr1}:B{$hdr2}");

        $ws->mergeCells("C{$hdr1}:C{$hdr2}");
        $ws->setCellValue("C{$hdr1}", 'Allotted Budget');
        $this->colHdr($ws, "C{$hdr1}:C{$hdr2}");

        $ws->mergeCells("D{$hdr1}:H{$hdr1}");
        $ws->setCellValue("D{$hdr1}", 'Standards per Success Indicator');
        $ws->getStyle("D{$hdr1}:H{$hdr1}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_STDHDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => $this->thinBorder(self::BDR_BLACK),
        ]);
        $ws->getRowDimension($hdr1)->setRowHeight(18);

        // Row 2: rating numbers 5 4 3 2 1
        $r = $hdr2;
        foreach (['D' => '5', 'E' => '4', 'F' => '3', 'G' => '2', 'H' => '1'] as $col => $val) {
            $ws->setCellValue("{$col}{$r}", $val);
            $ws->getStyle("{$col}{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => self::FG_WHITE]],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_STDHDR]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                                'vertical'   => Alignment::VERTICAL_CENTER],
                'borders'   => $this->thinBorder(self::BDR_BLACK),
            ]);
        }
        $ws->getRowDimension($r)->setRowHeight(18);
        $r++;

        // ── Data rows ──────────────────────────────────────────────────────────
        $outputs = $uwpData['outputs'] ?? [];
        $byType  = ['core' => [], 'support' => []];
        foreach ($outputs as $out) {
            $byType[strtolower($out['function_type'] ?? 'core')][] = $out;
        }

        foreach ([
            'core'    => ['A. CORE FUNCTIONS (80%)',    self::BG_CORE],
            'support' => ['C. SUPPORT FUNCTIONS (20%)', self::BG_SUPPORT],
        ] as $type => [$label, $bgColor]) {
            // Section banner
            $ws->mergeCells("A{$r}:H{$r}");
            $ws->setCellValue("A{$r}", $label);
            $ws->getStyle("A{$r}:H{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT,
                                'vertical'   => Alignment::VERTICAL_CENTER,
                                'indent'     => 1],
                'borders'   => $this->thinBorder(self::BDR_BLACK),
            ]);
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;

            foreach ($byType[$type] as $output) {
                $mfoTitle   = $output['mfo'] ?? '';
                $indicators = $output['success_indicators'] ?? [];
                $mfoStart   = $r;

                if (empty($indicators)) {
                    $this->writeDataRow($ws, $r, $mfoTitle, '', [], []);
                    $ws->getRowDimension($r)->setRowHeight(36);
                    $r++;
                    continue;
                }

                foreach ($indicators as $idx => $si) {
                    $siText  = $si['text'] ?? '';
                    $siStds  = $standards[$siText] ?? [];
                    $stdCols = [];
                    foreach ([5, 4, 3, 2, 1] as $rating) {
                        $parts = [];
                        if (!empty($siStds[$rating]['q'])) $parts[] = 'Q: ' . implode('; ', $siStds[$rating]['q']);
                        if (!empty($siStds[$rating]['e'])) $parts[] = 'E: ' . implode('; ', $siStds[$rating]['e']);
                        if (!empty($siStds[$rating]['t'])) $parts[] = 'T: ' . implode('; ', $siStds[$rating]['t']);
                        $stdCols[$rating] = implode("\n", $parts);
                    }

                    $this->writeDataRow($ws, $r, $idx === 0 ? $mfoTitle : '', $siText, $stdCols, $si);

                    // Row height based on content
                    $maxLines = max(1,
                        (int) ceil(mb_strlen($siText) / 38),
                        ...array_map(fn($t) => $t ? substr_count($t, "\n") + 1 : 1, $stdCols)
                    );
                    $ws->getRowDimension($r)->setRowHeight(max(36, $maxLines * 13));
                    $r++;
                }

                if (count($indicators) > 1) {
                    $ws->mergeCells("A{$mfoStart}:A" . ($r - 1));
                    // Re-apply MFO cell style after merge
                    $ws->getStyle("A{$mfoStart}")->applyFromArray([
                        'font'      => ['bold' => true, 'size' => 8],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT,
                                        'vertical'   => Alignment::VERTICAL_TOP,
                                        'wrapText'   => true],
                        'borders'   => $this->thinBorder(self::BDR_GRAY),
                    ]);
                }
            }
        }

        // ── Footer summary rows ────────────────────────────────────────────────
        foreach ([
            'Weighted Average Rating for Core Functions (80%)',
            'Weighted Average Rating for Strategic Objectives (35%)',
            'OVERALL RATING',
            'ADJECTIVAL RATING',
        ] as $label) {
            // Label spans A–C (right-aligned), value area spans D–H (empty, bordered)
            $ws->mergeCells("A{$r}:C{$r}");
            $ws->mergeCells("D{$r}:H{$r}");
            $ws->setCellValue("A{$r}", $label);
            $ws->setCellValue("D{$r}", ''); // explicitly empty
            $ws->getStyle("A{$r}:C{$r}")->applyFromArray([
                'font'      => ['size' => 8, 'italic' => true],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOTER]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT,
                                'vertical'   => Alignment::VERTICAL_CENTER],
                'borders'   => $this->thinBorder(self::BDR_BLACK),
            ]);
            $ws->getStyle("D{$r}:H{$r}")->applyFromArray([
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOTER]],
                'borders' => $this->thinBorder(self::BDR_BLACK),
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }

        // ── Signature block ────────────────────────────────────────────────────
        // Layout: [A:B] Discussed | [C] Date | [D:E] Assessed by | [F] Date | [G:H] Final Rating Approved
        $sigStyle = [
            'font'      => ['bold' => true, 'size' => 8],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_FOOTER]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => $this->thinBorder(self::BDR_BLACK),
        ];
        $emptyStyle = [
            'borders' => $this->thinBorder(self::BDR_BLACK),
        ];

        // Header row
        $ws->mergeCells("A{$r}:B{$r}");
        $ws->mergeCells("D{$r}:E{$r}");
        $ws->mergeCells("G{$r}:H{$r}");
        $ws->setCellValue("A{$r}", 'Discussed with and Agreed by:');
        $ws->setCellValue("C{$r}", 'Date');
        $ws->setCellValue("D{$r}", 'Assessed by:');
        $ws->setCellValue("F{$r}", 'Date');
        $ws->setCellValue("G{$r}", 'Final Rating Approved by:');
        foreach (["A{$r}:B{$r}", "C{$r}", "D{$r}:E{$r}", "F{$r}", "G{$r}:H{$r}"] as $range) {
            $ws->getStyle($range)->applyFromArray($sigStyle);
        }
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // Blank signature rows (3)
        foreach (range(1, 3) as $_) {
            $ws->mergeCells("A{$r}:B{$r}");
            $ws->mergeCells("D{$r}:E{$r}");
            $ws->mergeCells("G{$r}:H{$r}");
            foreach (["A{$r}:B{$r}", "C{$r}", "D{$r}:E{$r}", "F{$r}", "G{$r}:H{$r}"] as $range) {
                $ws->getStyle($range)->applyFromArray($emptyStyle);
            }
            $ws->getRowDimension($r)->setRowHeight(18);
            $r++;
        }

        // Role labels row
        $ws->mergeCells("A{$r}:B{$r}");
        $ws->mergeCells("D{$r}:E{$r}");
        $ws->mergeCells("G{$r}:H{$r}");
        $ws->setCellValue("A{$r}", 'PGDH');
        $ws->setCellValue("D{$r}", 'PMT Chairperson');
        $ws->setCellValue("G{$r}", 'Governor');
        foreach (["A{$r}:B{$r}", "C{$r}", "D{$r}:E{$r}", "F{$r}", "G{$r}:H{$r}"] as $range) {
            $ws->getStyle($range)->applyFromArray($sigStyle);
        }
        $ws->getRowDimension($r)->setRowHeight(14);

        // ── Page setup ─────────────────────────────────────────────────────────
        $ws->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A3)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.5)->setBottom(0.5)->setLeft(0.4)->setRight(0.4);

        // ── Stream ─────────────────────────────────────────────────────────────
        $safeName = preg_replace('/[^A-Za-z0-9_\-\.]/', '_',
            "UWP_{$office}_{$period}.xlsx");
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(fn() => $writer->save('php://output'), $safeName, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function writeDataRow(Worksheet $ws, int $r, string $mfo, string $si, array $stdCols, array $siData): void
    {
        $ws->setCellValue("A{$r}", $mfo);
        $ws->setCellValue("B{$r}", $si);
        $ws->setCellValue("C{$r}", ''); // budget intentionally empty
        $ws->setCellValue("D{$r}", $stdCols[5] ?? '');
        $ws->setCellValue("E{$r}", $stdCols[4] ?? '');
        $ws->setCellValue("F{$r}", $stdCols[3] ?? '');
        $ws->setCellValue("G{$r}", $stdCols[2] ?? '');
        $ws->setCellValue("H{$r}", $stdCols[1] ?? '');

        $base = [
            'font'      => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT,
                            'vertical'   => Alignment::VERTICAL_TOP,
                            'wrapText'   => true],
            'borders'   => $this->thinBorder(self::BDR_GRAY),
        ];
        $ws->getStyle("A{$r}:H{$r}")->applyFromArray($base);

        if ($mfo) {
            $ws->getStyle("A{$r}")->getFont()->setBold(true);
        }
    }

    private function colHdr(Worksheet $ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_NAVY]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER,
                            'wrapText'   => true],
            'borders'   => $this->thinBorder(self::BDR_BLACK),
        ]);
    }

    private function thinBorder(string $color = self::BDR_BLACK): array
    {
        $b = ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => $color]];
        return ['allBorders' => $b];
    }
}
