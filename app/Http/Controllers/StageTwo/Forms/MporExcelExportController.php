<?php

namespace App\Http\Controllers\StageTwo\Forms;

use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\OrsEntry;
use Carbon\Carbon;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MporExcelExportController extends Controller
{
    // Colors
    private const BG_HDR     = 'FF1F3864'; // dark navy - column headers
    private const BG_SECTION = 'FF2F5597'; // section rows
    private const BG_TOTAL   = 'FFD6E4F0'; // grand total row
    private const FG_WHITE   = 'FFFFFFFF';
    private const FG_BLUE    = 'FF2F5597';
    private const FG_BLACK   = 'FF000000';
    private const BDR_BLACK  = 'FF000000';
    private const BDR_GRAY   = 'FFB0B0B0';

    public function export(Request $request)
    {
        $user  = auth()->user();
        $month = $request->query('month', now()->format('Y-m'));

        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = now()->format('Y-m');
        }

        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end   = $start->copy()->endOfMonth();

        // Load employee data
        $ipcr = Ipcr::where('employee_id', $user->id)
            ->whereIn('status', ['committed', 'for_commitment'])
            ->latest()->first();

        // Compute MPOR data (same as controller)
        $entries = OrsEntry::with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
            ->where('employee_id', $user->id)
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$start, $end])
            ->get()
            ->filter(fn($e) => ($m = $e->monitoring->first()) && $m->quality_rating !== null && $m->timeliness_rating !== null);

        $weekOf = fn($date) => match (true) {
            Carbon::parse($date)->day <= 7  => 1,
            Carbon::parse($date)->day <= 14 => 2,
            Carbon::parse($date)->day <= 21 => 3,
            default                          => 4,
        };

        // Pre-seed all function sections from the committed IPCR so sections with
        // zero entries (e.g. Support Functions) still appear in the export.
        $sections = [];
        if ($ipcr) {
            $ipcr->loadMissing('items.indicator.uwpMfo.uwpFunction');
            foreach ($ipcr->items as $item) {
                $fn  = $item->indicator?->uwpMfo?->uwpFunction;
                $mfo = $item->indicator?->uwpMfo;
                if (! $fn || ! $mfo) continue;
                $key    = $fn->function_type;
                $rowKey = strtolower(trim($mfo->title));
                if (! isset($sections[$key])) {
                    $sections[$key] = ['label' => $fn->name, 'weight' => $fn->weight_percent, 'rows' => []];
                }
                if (! isset($sections[$key]['rows'][$rowKey])) {
                    $sections[$key]['rows'][$rowKey] = ['title' => $mfo->title, 'qty' => [1=>0,2=>0,3=>0,4=>0], 'quality' => [1=>0,2=>0,3=>0,4=>0], 'timeliness' => [1=>0,2=>0,3=>0,4=>0]];
                }
            }
        }

        foreach ($entries as $entry) {
            $indicator = $entry->ipcrItem?->indicator;
            if (! $indicator) continue;
            $mfo      = $indicator->uwpMfo;
            $fn       = $mfo?->uwpFunction;
            $fnType   = $fn?->function_type ?? 'core';
            $fnName   = $fn?->name ?? ($fnType === 'core' ? 'A. CORE FUNCTIONS' : 'B. SUPPORT FUNCTIONS');
            $fnWeight = $fn?->weight_percent ?? ($fnType === 'core' ? 80 : 20);
            $rowKey   = strtolower(trim($mfo?->title ?? 'Unknown'));
            $week     = $weekOf($entry->work_date);
            $mon      = $entry->monitoring->first();
            $qty      = (int) $entry->quantity;

            if (! isset($sections[$fnType])) {
                $sections[$fnType] = ['label' => $fnName, 'weight' => $fnWeight, 'rows' => []];
            }
            if (! isset($sections[$fnType]['rows'][$rowKey])) {
                $sections[$fnType]['rows'][$rowKey] = ['title' => $mfo?->title ?? 'Unknown', 'qty' => [1=>0,2=>0,3=>0,4=>0], 'quality' => [1=>0,2=>0,3=>0,4=>0], 'timeliness' => [1=>0,2=>0,3=>0,4=>0]];
            }
            $sections[$fnType]['rows'][$rowKey]['qty'][$week]        += $qty;
            $sections[$fnType]['rows'][$rowKey]['quality'][$week]    += $qty * ($mon->quality_rating ?? 0);
            $sections[$fnType]['rows'][$rowKey]['timeliness'][$week] += $qty * ($mon->timeliness_rating ?? 0);
        }

        // Compute averages per row
        foreach ($sections as &$sec) {
            foreach ($sec['rows'] as &$row) {
                $qtyTotal = array_sum($row['qty']);
                $row['qty_total']  = $qtyTotal;
                $row['qual_avg']   = $qtyTotal > 0 ? round(array_sum($row['quality'])    / $qtyTotal, 2) : 0;
                $row['time_avg']   = $qtyTotal > 0 ? round(array_sum($row['timeliness']) / $qtyTotal, 2) : 0;
                $row['qual_w']     = array_map(fn($v) => round($v, 1), $row['quality']);
                $row['time_w']     = array_map(fn($v) => round($v, 1), $row['timeliness']);
            }
            unset($row);
        }
        unset($sec);
        ksort($sections);

        $grandQty    = [1=>0,2=>0,3=>0,4=>0];
        $grandQtyTot = 0;
        $grandQualN  = 0;
        $grandQualD  = 0;
        $grandTimeN  = 0;
        $grandTimeD  = 0;
        foreach ($sections as $sec) {
            foreach ($sec['rows'] as $row) {
                for ($w = 1; $w <= 4; $w++) $grandQty[$w] += $row['qty'][$w];
                $grandQtyTot += $row['qty_total'];
                $grandQualN  += array_sum($row['quality']);
                $grandQualD  += $row['qty_total'];
                $grandTimeN  += array_sum($row['timeliness']);
                $grandTimeD  += $row['qty_total'];
            }
        }
        $grandQualAvg = $grandQualD > 0 ? round($grandQualN / $grandQualD, 2) : 0;
        $grandTimeAvg = $grandTimeD > 0 ? round($grandTimeN / $grandTimeD, 2) : 0;

        // Supervisor from same office
        $mpor       = Mpor::where('employee_id', $user->id)->where('month', $month)->first();
        $supervisor = \App\Models\User::where('office_id', $user->office_id)->where('role', 'supervisor')->first();
        $monthLabel = Carbon::parse($month . '-01')->format('F Y');

        // ── Build spreadsheet ──────────────────────────────────────────────────
        $ss = new Spreadsheet();
        $ws = $ss->getActiveSheet();
        $ws->setTitle('MPOR');

        // Columns: A=output (wide), B-F=qty W1-4+total, G-K=quality W1-4+total, L-P=timeliness W1-4+total
        // A=36, B-F=6 each, G-K=6 each, L-P=6 each
        $ws->getColumnDimension('A')->setWidth(38);
        foreach (range(1, 15) as $i) {
            $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i + 1);
            $ws->getColumnDimension($col)->setWidth(6.5);
        }

        $r = 1;

        // ── Logo ──────────────────────────────────────────────────────────────
        $logoPath = public_path('images/exports/pgds-logo.png');
        if (file_exists($logoPath)) {
            $logo = new Drawing();
            $logo->setPath($logoPath)->setCoordinates('G1')
                ->setHeight(50)->setOffsetX(10)->setWorksheet($ws);
        }

        // ── Government header ──────────────────────────────────────────────────
        $lastCol = 'P';
        foreach ([
            ['Republic of the Philippines',    false, 9],
            ['PROVINCE OF DAVAO DEL SUR',      true,  11],
            ['Matti, Digos City',              false, 9],
        ] as [$text, $bold, $size]) {
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => $size, 'color' => ['argb' => self::FG_BLUE]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight($bold ? 16 : 13);
            $r++;
        }

        // Blank spacer
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // Title
        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'MONTHLY PERFORMANCE OUTPUT REPORT');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 12, 'color' => ['argb' => self::FG_BLACK]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(18);
        $r++;

        // Spacer
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // NAME / OFFICE / MONTH row
        $ws->mergeCells("A{$r}:F{$r}");
        $ws->mergeCells("G{$r}:K{$r}");
        $ws->mergeCells("L{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'NAME:   ' . strtoupper($user->name));
        $ws->setCellValue("G{$r}", 'OFFICE/DIVISION:   ' . strtoupper($user->office?->name ?? ''));
        $ws->setCellValue("L{$r}", 'MONTH:   ' . strtoupper($monthLabel));
        foreach (["A{$r}:F{$r}", "G{$r}:K{$r}", "L{$r}:{$lastCol}{$r}"] as $range) {
            $ws->getStyle($range)->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9, 'underline' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
        }
        $ws->getRowDimension($r)->setRowHeight(16);
        $r++;

        // ── Column headers (3 rows) ────────────────────────────────────────────
        $h1 = $r; $h2 = $r + 1; $h3 = $r + 2;

        // Row 1: EXPECTED OUTPUTS (spans 3 rows) | EFFICIENCY/QUANTITY (5 cols) | QUALITY/EFFECTIVENESS (5 cols) | TIMELINESS (5 cols)
        $ws->mergeCells("A{$h1}:A{$h3}");
        $ws->setCellValue("A{$h1}", 'EXPECTED OUTPUTS');
        $this->hdr($ws, "A{$h1}");

        $ws->mergeCells("B{$h1}:F{$h1}");
        $ws->setCellValue("B{$h1}", 'EFFICIENCY/QUANTITY');
        $this->hdr($ws, "B{$h1}:F{$h1}");

        $ws->mergeCells("G{$h1}:K{$h1}");
        $ws->setCellValue("G{$h1}", 'QUALITY/EFFECTIVENESS');
        $this->hdr($ws, "G{$h1}:K{$h1}");

        $ws->mergeCells("L{$h1}:{$lastCol}{$h1}");
        $ws->setCellValue("L{$h1}", 'TIMELINESS');
        $this->hdr($ws, "L{$h1}:{$lastCol}{$h1}");

        // Row 2: WEEK (spans 4 cols) + TOTAL for each group
        foreach (['B', 'G', 'L'] as $start) {
            $endW = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(
                \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($start) + 3
            );
            $ws->mergeCells("{$start}{$h2}:{$endW}{$h2}");
            $ws->setCellValue("{$start}{$h2}", 'WEEK');
            $this->hdr($ws, "{$start}{$h2}:{$endW}{$h2}");

            $totalCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(
                \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($start) + 4
            );
            $ws->mergeCells("{$totalCol}{$h2}:{$totalCol}{$h3}");
            $ws->setCellValue("{$totalCol}{$h2}", 'TOTAL');
            $this->hdr($ws, "{$totalCol}{$h2}:{$totalCol}{$h3}");
        }

        // Row 3: 1 2 3 4 for each group
        $weekCols = ['B','C','D','E', 'G','H','I','J', 'L','M','N','O'];
        foreach ($weekCols as $i => $col) {
            $ws->setCellValue("{$col}{$h3}", ($i % 4) + 1);
            $this->hdr($ws, "{$col}{$h3}");
        }

        foreach ([$h1, $h2, $h3] as $hr) $ws->getRowDimension($hr)->setRowHeight(14);
        $r = $h3 + 1;

        // ── Data rows ──────────────────────────────────────────────────────────
        foreach ($sections as $sec) {
            // Section header row
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", strtoupper($sec['label']) . " ({$sec['weight']}%)");
            $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_SECTION]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
            $ws->getRowDimension($r)->setRowHeight(15);
            $r++;

            foreach ($sec['rows'] as $row) {
                $this->dataRow($ws, $r, $row);
                $r++;
            }
        }

        // ── Man days / hours lost ──────────────────────────────────────────────
        $bottomHdrStyle = [
            'font'      => ['bold' => false, 'size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ];
        // Header: WEEK 1 | WEEK 2 | WEEK 3 | WEEK 4 | TOTAL
        $ws->getStyle("B{$r}:F{$r}")->applyFromArray($bottomHdrStyle);
        $ws->getStyle("G{$r}:K{$r}")->applyFromArray($bottomHdrStyle);
        $ws->getStyle("L{$r}:{$lastCol}{$r}")->applyFromArray($bottomHdrStyle);
        foreach (['B'=>'WEEK 1','C'=>'WEEK 2','D'=>'WEEK 3','E'=>'WEEK 4','F'=>'TOTAL'] as $col => $lbl) {
            $ws->setCellValue("{$col}{$r}", $lbl);
        }
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        foreach ([
            ['MAN DAY(S) LOST THRU ABSENCE',                   '0days'],
            ['MAN HRS./MINUTES LOST THRU TARDINESS/ UNDERTIME','0mins'],
        ] as [$label, $default]) {
            $ws->mergeCells("A{$r}:E{$r}");
            $ws->setCellValue("A{$r}", $label);
            $ws->setCellValue("F{$r}", $default);
            $ws->getStyle("A{$r}:E{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_SECTION]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER, 'indent' => 1],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
            $ws->getStyle("F{$r}:{$lastCol}{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 8],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }

        // Spacer
        $ws->getRowDimension($r)->setRowHeight(6);
        $r++;

        // ── Signature block ────────────────────────────────────────────────────
        // Layout:  [A:G] CONFIRMED block  |  [H:P] Employee block
        $sigBase = [
            'font'      => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ];

        $sigStart = $r;
        // Row: "CONFIRMED:" label  |  "Above information..."
        $ws->mergeCells("A{$r}:G{$r}");
        $ws->mergeCells("H{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'CONFIRMED:');
        $ws->setCellValue("H{$r}", 'Above information are true');
        $ws->getStyle("A{$r}:G{$r}")->applyFromArray($sigBase);
        $ws->getStyle("H{$r}:{$lastCol}{$r}")->applyFromArray($sigBase);
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // Row: blank (date area)  |  "and correct:"
        $ws->mergeCells("A{$r}:E{$r}");
        $ws->mergeCells("F{$r}:G{$r}");
        $ws->mergeCells("H{$r}:{$lastCol}{$r}");
        $ws->setCellValue("F{$r}", 'Date');
        $ws->setCellValue("H{$r}", 'and correct:');
        foreach (["A{$r}:E{$r}", "F{$r}:G{$r}", "H{$r}:{$lastCol}{$r}"] as $range) {
            $ws->getStyle($range)->applyFromArray($sigBase);
        }
        $ws->getRowDimension($r)->setRowHeight(13);
        $r++;

        // Blank signature rows
        foreach (range(1, 3) as $_) {
            $ws->mergeCells("A{$r}:E{$r}");
            $ws->mergeCells("F{$r}:G{$r}");
            $ws->mergeCells("H{$r}:N{$r}");
            $ws->mergeCells("O{$r}:{$lastCol}{$r}");
            foreach (["A{$r}:E{$r}", "F{$r}:G{$r}", "H{$r}:N{$r}", "O{$r}:{$lastCol}{$r}"] as $range) {
                $ws->getStyle($range)->applyFromArray($sigBase);
            }
            $ws->getRowDimension($r)->setRowHeight(18);
            $r++;
        }

        // Supervisor name + Date | Employee name + Date
        $ws->mergeCells("A{$r}:E{$r}");
        $ws->mergeCells("F{$r}:G{$r}");
        $ws->mergeCells("H{$r}:N{$r}");
        $ws->mergeCells("O{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", strtoupper($supervisor?->name ?? 'Direct Supervisor'));
        $ws->setCellValue("F{$r}", 'Date');
        $ws->setCellValue("H{$r}", strtoupper($user->name));
        $ws->setCellValue("O{$r}", 'Date');
        foreach (["A{$r}:E{$r}", "F{$r}:G{$r}", "H{$r}:N{$r}", "O{$r}:{$lastCol}{$r}"] as $range) {
            $ws->getStyle($range)->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
        }
        $ws->getRowDimension($r)->setRowHeight(15);
        $r++;

        // Position labels
        $ws->mergeCells("A{$r}:E{$r}");
        $ws->mergeCells("F{$r}:G{$r}");
        $ws->mergeCells("H{$r}:N{$r}");
        $ws->mergeCells("O{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", $supervisor?->position ?? 'Position');
        $ws->setCellValue("H{$r}", $user->position ?? 'Position');
        foreach (["A{$r}:E{$r}", "F{$r}:G{$r}", "H{$r}:N{$r}", "O{$r}:{$lastCol}{$r}"] as $range) {
            $ws->getStyle($range)->applyFromArray([
                'font'      => ['size' => 8, 'italic' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
            ]);
        }
        $ws->getRowDimension($r)->setRowHeight(13);

        // ── Page setup ─────────────────────────────────────────────────────────
        $ws->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.4)->setBottom(0.4)->setLeft(0.35)->setRight(0.35);

        $safeName = preg_replace('/[^A-Za-z0-9_\-\.]/', '_',
            "MPOR_{$user->name}_{$month}.xlsx");

        $writer = new Xlsx($ss);
        return response()->streamDownload(fn() => $writer->save('php://output'), $safeName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    private function dataRow($ws, int $r, array $row): void
    {
        $ws->setCellValue("A{$r}", $row['title']);
        // Quantity W1-4 + Total
        $ws->setCellValue("B{$r}", $row['qty'][1] ?: 0);
        $ws->setCellValue("C{$r}", $row['qty'][2] ?: 0);
        $ws->setCellValue("D{$r}", $row['qty'][3] ?: 0);
        $ws->setCellValue("E{$r}", $row['qty'][4] ?: 0);
        $ws->setCellValue("F{$r}", $row['qty_total'] ?: 0);
        // Quality W1-4 (per-week avg) + Total avg
        $ws->setCellValue("G{$r}", $row['qual_w'][1] ?: 0);
        $ws->setCellValue("H{$r}", $row['qual_w'][2] ?: 0);
        $ws->setCellValue("I{$r}", $row['qual_w'][3] ?: 0);
        $ws->setCellValue("J{$r}", $row['qual_w'][4] ?: 0);
        $ws->setCellValue("K{$r}", $row['qual_avg'] ?: 0);
        // Timeliness W1-4 + Total avg
        $ws->setCellValue("L{$r}", $row['time_w'][1] ?: 0);
        $ws->setCellValue("M{$r}", $row['time_w'][2] ?: 0);
        $ws->setCellValue("N{$r}", $row['time_w'][3] ?: 0);
        $ws->setCellValue("O{$r}", $row['time_w'][4] ?: 0);
        $ws->setCellValue("P{$r}", $row['time_avg'] ?: 0);

        $ws->getStyle("A{$r}:P{$r}")->applyFromArray([
            'font'      => ['size' => 8],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_GRAY]]],
        ]);
        $ws->getStyle("A{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT)->setIndent(1);
        $ws->getRowDimension($r)->setRowHeight(max(28, (int) ceil(mb_strlen($row['title']) / 36) * 13));
    }

    private function hdr($ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_HDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
    }
}
