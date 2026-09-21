<?php

namespace App\Http\Controllers\StageOne\Forms;

use App\Http\Controllers\Controller;
use App\Models\OrsEntry;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class OrsExcelExportController extends Controller
{
    private const BG_NAVY    = 'FF1F3864';
    private const BG_HEADER  = 'FF2F5597';
    private const BG_LIGHT   = 'FFF2F6FC';
    private const FG_WHITE   = 'FFFFFFFF';
    private const FG_DARK    = 'FF1A202C';
    private const FG_BLUE    = 'FF2F5597';
    private const FG_RED     = 'FFC00000';
    private const BDR_BLACK  = 'FF000000';
    private const BDR_GRAY   = 'FFD1D5DB';

    public function export(Request $request)
    {
        $entry = OrsEntry::with([
            'employee.employee.office:id,name',
            'supervisor.employee.office:id,name',
            'ipcrItem.indicator.uwpMfo.uwpFunction',
            'monitoring.supervisor.employee',
        ])->findOrFail($request->query('ors_id', 0));

        $userId = auth()->id();
        $user = auth()->user();
        $isAuthorized = $userId === $entry->employee_id
            || $userId === $entry->supervisor_id
            || ($user && $user->hasAnyRole(['admin', 'pmt', 'dept-head']));

        abort_unless($isAuthorized, 403);
        abort_unless($entry->status === 'rated', 403, 'Only validated ORS entries can be exported.');

        $mon        = $entry->monitoring->first();
        $employee   = $entry->employee?->name ?? '—';
        $position   = $entry->employee?->employee?->position ?? '—';
        $office     = $entry->employee?->employee?->office?->name ?? '—';
        $mfoTitle   = $entry->ipcrItem?->indicator?->uwpMfo?->title ?? '—';
        $indicator  = $entry->ipcrItem?->indicator?->indicator_text ?? '—';
        $notes      = $entry->notes ?: ($indicator !== '—' ? $indicator : 'Standard task output');
        $workDate   = $entry->work_date?->format('F j, Y') ?? $entry->submitted_at?->format('F j, Y') ?? '—';
        $submitted  = $entry->submitted_at?->format('F j, Y g:i A') ?? $workDate;

        $quantity   = $entry->quantity ?? '—';
        $quality    = $mon?->quality_rating !== null ? (float) $mon->quality_rating : null;
        $timeliness = $mon?->timeliness_rating !== null ? (float) $mon->timeliness_rating : null;
        $average    = ($quality !== null && $timeliness !== null)
            ? round(($quality + $timeliness) / 2, 2)
            : ($quality ?? $timeliness ?? '—');

        $remarks    = $mon?->remarks ?: 'No remarks provided.';
        $ratedAt    = $mon?->rated_at?->format('F j, Y') ?? $mon?->updated_at?->format('F j, Y') ?? '—';
        $supervisor = $mon?->supervisor?->name ?? $entry->supervisor?->name ?? '—';
        $supervisorPos = $mon?->supervisor?->employee?->position ?? $entry->supervisor?->employee?->position ?? 'Immediate Supervisor';

        $ss = new Spreadsheet();
        $ws = $ss->getActiveSheet();
        $ws->setTitle('Annex G - ORS');

        // Page setup
        $ws->getPageSetup()->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_PORTRAIT);
        $ws->getPageSetup()->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4);
        $ws->setShowGridLines(true);

        // Column widths (Columns A to F)
        $ws->getColumnDimension('A')->setWidth(18);
        $ws->getColumnDimension('B')->setWidth(24);
        $ws->getColumnDimension('C')->setWidth(14);
        $ws->getColumnDimension('D')->setWidth(14);
        $ws->getColumnDimension('E')->setWidth(14);
        $ws->getColumnDimension('F')->setWidth(16);

        $r = 1;

        // Logo
        $logoPath = public_path('images/exports/pgds-logo.png');
        if (file_exists($logoPath)) {
            $logo = new Drawing();
            $logo->setPath($logoPath);
            $logo->setCoordinates('B1');
            $logo->setHeight(46);
            $logo->setOffsetX(10);
            $logo->setWorksheet($ws);
        }

        // Header lines
        foreach ([
            ['Republic of the Philippines', false, 9, self::FG_RED],
            ['PROVINCE OF DAVAO DEL SUR', true, 11, self::FG_BLUE],
            ['Matti, Digos City', false, 9, self::FG_DARK],
        ] as [$text, $bold, $size, $color]) {
            $ws->mergeCells("A{$r}:F{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => $size, 'color' => ['argb' => $color], 'name' => 'Calibri'],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight(16);
            $r++;
        }

        // Title banner
        $ws->mergeCells("A{$r}:F{$r}");
        $ws->setCellValue("A{$r}", 'ANNEX G - OUTPUT RATING SHEET (ORS)');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => self::FG_WHITE], 'name' => 'Calibri'],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_NAVY]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(24);
        $r += 2;

        // Metadata block
        $metaRows = [
            ['Name of Employee:', $employee, 'Date of Submission:', $submitted],
            ['Position / Title:', $position, 'Work / Task Date:', $workDate],
            ['Division / Office:', $office, 'Status:', 'RATED / VALIDATED'],
            ['Major Final Output:', $mfoTitle, '', ''],
        ];

        foreach ($metaRows as $row) {
            $ws->setCellValue("A{$r}", $row[0]);
            $ws->mergeCells("B{$r}:C{$r}");
            $ws->setCellValue("B{$r}", $row[1]);

            if (!empty($row[2])) {
                $ws->setCellValue("D{$r}", $row[2]);
                $ws->mergeCells("E{$r}:F{$r}");
                $ws->setCellValue("E{$r}", $row[3]);
            } else {
                $ws->mergeCells("B{$r}:F{$r}");
            }

            $ws->getStyle("A{$r}")->getFont()->setBold(true)->setSize(9);
            $ws->getStyle("D{$r}")->getFont()->setBold(true)->setSize(9);
            $ws->getStyle("B{$r}")->getFont()->setSize(9);
            $ws->getStyle("E{$r}")->getFont()->setSize(9);

            $ws->getStyle("A{$r}:F{$r}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
            $ws->getRowDimension($r)->setRowHeight(18);
            $r++;
        }

        $r++;

        // Performance Details Table Header
        $tableHeaderRow = $r;
        $ws->mergeCells("A{$r}:B{$r}");
        $ws->setCellValue("A{$r}", 'OUTPUT / TASK DESCRIPTION');
        $ws->setCellValue("C{$r}", "QUANTITY\n(Qn)");
        $ws->setCellValue("D{$r}", "QUALITY\n(Q)");
        $ws->setCellValue("E{$r}", "TIMELINESS\n(T)");
        $ws->setCellValue("F{$r}", "AVERAGE\n(A)");

        $ws->getStyle("A{$r}:F{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE], 'name' => 'Calibri'],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_HEADER]],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER,
                'wrapText'   => true,
            ],
            'borders'   => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]],
            ],
        ]);
        $ws->getRowDimension($r)->setRowHeight(28);
        $r++;

        // Performance Details Table Content
        $dataRow = $r;
        $ws->mergeCells("A{$r}:B{$r}");
        $ws->setCellValue("A{$r}", $notes);
        $ws->setCellValue("C{$r}", $quantity);
        $ws->setCellValue("D{$r}", $quality !== null ? number_format($quality, 2) : '—');
        $ws->setCellValue("E{$r}", $timeliness !== null ? number_format($timeliness, 2) : '—');
        $ws->setCellValue("F{$r}", is_numeric($average) ? number_format((float) $average, 2) : $average);

        $ws->getStyle("A{$r}:B{$r}")->applyFromArray([
            'font'      => ['size' => 9, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);

        $ws->getStyle("C{$r}:F{$r}")->applyFromArray([
            'font'      => ['size' => 10, 'bold' => true, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(40);
        $r++;

        $r++;

        // Supervisor Remarks Section
        $ws->mergeCells("A{$r}:F{$r}");
        $ws->setCellValue("A{$r}", 'SUPERVISOR FEEDBACK & REMARKS');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE], 'name' => 'Calibri'],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_NAVY]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(20);
        $r++;

        $ws->mergeCells("A{$r}:F{$r}");
        $ws->setCellValue("A{$r}", $remarks);
        $ws->getStyle("A{$r}:F{$r}")->applyFromArray([
            'font'      => ['size' => 9, 'italic' => empty($mon?->remarks), 'name' => 'Calibri'],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_LIGHT]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(50);
        $r += 2;

        // Signatures Block
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->setCellValue("A{$r}", 'Conforme / Employee:');
        $ws->setCellValue("D{$r}", 'Rated & Evaluated by:');
        $ws->getStyle("A{$r}:F{$r}")->getFont()->setBold(true)->setSize(9);
        $r += 2;

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->setCellValue("A{$r}", mb_strtoupper($employee));
        $ws->setCellValue("D{$r}", mb_strtoupper($supervisor));
        $ws->getStyle("A{$r}:F{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 10, 'underline' => true, 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $r++;

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->setCellValue("A{$r}", $position);
        $ws->setCellValue("D{$r}", $supervisorPos);
        $ws->getStyle("A{$r}:F{$r}")->applyFromArray([
            'font'      => ['size' => 9, 'color' => ['argb' => 'FF4B5563'], 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $r++;

        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:F{$r}");
        $ws->setCellValue("A{$r}", 'Date: ' . $submitted);
        $ws->setCellValue("D{$r}", 'Date Rated: ' . $ratedAt);
        $ws->getStyle("A{$r}:F{$r}")->applyFromArray([
            'font'      => ['size' => 8, 'italic' => true, 'color' => ['argb' => 'FF6B7280'], 'name' => 'Calibri'],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $writer   = new Xlsx($ss);
        $filename = 'ORS_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $employee) . '_' . now()->format('Ymd') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}

