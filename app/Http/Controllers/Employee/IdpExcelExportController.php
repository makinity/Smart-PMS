<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class IdpExcelExportController extends Controller
{
    private const BG_HDR    = 'FF1F3864';
    private const BG_ALT    = 'FFF2F6FC';
    private const FG_WHITE  = 'FFFFFFFF';
    private const FG_BLACK  = 'FF000000';
    private const FG_BLUE   = 'FF2F5597';
    private const BDR_BLACK = 'FF000000';

    public function export(DevelopmentPlan $idp)
    {
        abort_unless($idp->employee_id === auth()->id(), 403);

        $user   = auth()->user();
        $user->load('employee.office:id,name');
        $rows   = $idp->idp_rows ?? [];
        $period = $idp->performancePeriod?->name ?? '—';

        $ss    = new Spreadsheet;
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle('IDP');

        // ── Column widths ──────────────────────────────────────────────────────
        $sheet->getColumnDimension('A')->setWidth(38);
        $sheet->getColumnDimension('B')->setWidth(38);
        $sheet->getColumnDimension('C')->setWidth(26);
        $sheet->getColumnDimension('D')->setWidth(26);
        $sheet->getColumnDimension('E')->setWidth(20);
        $sheet->getColumnDimension('F')->setWidth(26);

        $r = 1;

        // ── Title block ────────────────────────────────────────────────────────
        $sheet->mergeCells("A{$r}:F{$r}");
        $sheet->setCellValue("A{$r}", 'Individual Development Plan Form');
        $this->style($sheet, "A{$r}:F{$r}", [
            'font'      => ['bold' => true, 'size' => 13, 'color' => ['argb' => self::FG_BLACK]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $r++;

        $sheet->mergeCells("A{$r}:F{$r}");
        $sheet->setCellValue("A{$r}", 'Annex H');
        $this->style($sheet, "A{$r}:F{$r}", [
            'font'      => ['bold' => true, 'size' => 11, 'color' => ['argb' => self::FG_BLUE]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $r += 2;

        // ── Employee info block ────────────────────────────────────────────────
        foreach ([
            ['Name:', $user->name],
            ['Position:', $user->position ?? '—'],
            ['Office:', $user->office?->name ?? '—'],
            ['Rating Period:', $period],
            ['Performance Score:', $idp->source_score ? number_format((float) $idp->source_score, 2) . ' (' . ($idp->source_rating ?? '—') . ')' : '—'],
        ] as [$label, $value]) {
            $sheet->mergeCells("C{$r}:D{$r}");
            $sheet->mergeCells("E{$r}:F{$r}");
            $sheet->setCellValue("C{$r}", $label);
            $sheet->setCellValue("E{$r}", $value);
            $this->style($sheet, "C{$r}:D{$r}", ['font' => ['bold' => true, 'size' => 10]]);
            $this->style($sheet, "E{$r}:F{$r}", ['font' => ['size' => 10]]);
            $r++;
        }
        $r++;

        // ── Column headers ─────────────────────────────────────────────────────
        $headers = [
            'A' => "Performance Gaps\nIdentify performance issues that affected your performance rating in the recent rating period.",
            'B' => "Developmental Activities\nList down specific activities that will help you address your performance gaps.",
            'C' => "Support Needed\n(e.g. financial, technical resources, etc.)",
            'D' => "Support Needed from Immediate Supervisor",
            'E' => "Expected Date of Completion",
            'F' => "Results\n(to be filled-out after this IDP has been implemented)",
        ];

        foreach ($headers as $col => $text) {
            $sheet->setCellValue("{$col}{$r}", $text);
        }

        $hdrRange = "A{$r}:F{$r}";
        $this->style($sheet, $hdrRange, [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_HDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $sheet->getRowDimension($r)->setRowHeight(60);
        $r++;

        // ── Data rows ──────────────────────────────────────────────────────────
        if (empty($rows)) {
            $sheet->mergeCells("A{$r}:F{$r}");
            $sheet->setCellValue("A{$r}", 'No development goals have been entered.');
            $this->style($sheet, "A{$r}:F{$r}", [
                'font'      => ['italic' => true, 'color' => ['argb' => 'FF888888']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
            $r++;
        }

        foreach ($rows as $i => $row) {
            $alt = $i % 2 === 1;
            $sheet->setCellValue("A{$r}", $row['performance_gap'] ?? '');
            $sheet->setCellValue("B{$r}", $row['developmental_activity'] ?? '');
            $sheet->setCellValue("C{$r}", $row['support_needed'] ?? '');
            $sheet->setCellValue("D{$r}", $row['support_from_supervisor'] ?? '');
            $sheet->setCellValue("E{$r}", $row['expected_completion'] ?? '');
            $sheet->setCellValue("F{$r}", $row['results'] ?? '');

            $rowStyle = [
                'font'      => ['size' => 9],
                'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ];
            if ($alt) {
                $rowStyle['fill'] = ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_ALT]];
            }
            $this->style($sheet, "A{$r}:F{$r}", $rowStyle);
            $sheet->getRowDimension($r)->setRowHeight(55);
            $r++;
        }

        $r++;

        // ── Signature block ────────────────────────────────────────────────────
        $sheet->mergeCells("A{$r}:B{$r}");
        $sheet->mergeCells("C{$r}:D{$r}");
        $sheet->mergeCells("E{$r}:F{$r}");
        $sheet->setCellValue("A{$r}", 'Prepared by:');
        $sheet->setCellValue("C{$r}", 'Recommended by:');
        $sheet->setCellValue("E{$r}", 'Approved by:');
        $this->style($sheet, "A{$r}:F{$r}", ['font' => ['bold' => true, 'size' => 9]]);
        $r += 3;

        // Signature name lines
        $sheet->mergeCells("A{$r}:B{$r}");
        $sheet->mergeCells("C{$r}:D{$r}");
        $sheet->mergeCells("E{$r}:F{$r}");
        $sheet->setCellValue("A{$r}", $idp->prepared_by_name ?? $user->name);
        $sheet->setCellValue("C{$r}", $idp->recommended_by_name ?? '');
        $sheet->setCellValue("E{$r}", $idp->approved_by_name ?? '');
        $this->style($sheet, "A{$r}:F{$r}", [
            'font'      => ['bold' => true, 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $r++;

        // Designation labels
        $sheet->mergeCells("A{$r}:B{$r}");
        $sheet->mergeCells("C{$r}:D{$r}");
        $sheet->mergeCells("E{$r}:F{$r}");
        $sheet->setCellValue("A{$r}", 'Designation (Employee)');
        $sheet->setCellValue("C{$r}", 'Designation (Immediate Supervisor/Equivalent)');
        $sheet->setCellValue("E{$r}", 'PGDH');
        $this->style($sheet, "A{$r}:F{$r}", [
            'font'      => ['size' => 8, 'italic' => true, 'color' => ['argb' => 'FF555555']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $r++;

        // Date line
        $sheet->mergeCells("A{$r}:B{$r}");
        $sheet->mergeCells("C{$r}:D{$r}");
        $sheet->mergeCells("E{$r}:F{$r}");
        $sheet->setCellValue("A{$r}", 'Date:');
        $sheet->setCellValue("C{$r}", 'Date:');
        $sheet->setCellValue("E{$r}", 'Date:');
        $this->style($sheet, "A{$r}:F{$r}", ['font' => ['size' => 9]]);

        // ── Output ─────────────────────────────────────────────────────────────
        $filename = 'IDP_' . str_replace(' ', '_', $user->name) . '_' . str_replace([' ', '/'], '_', $period) . '.xlsx';

        $writer = new Xlsx($ss);
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");
        header('Cache-Control: max-age=0');
        $writer->save('php://output');
        exit;
    }

    private function style($sheet, string $range, array $style): void
    {
        $sheet->getStyle($range)->applyFromArray($style);
    }
}
