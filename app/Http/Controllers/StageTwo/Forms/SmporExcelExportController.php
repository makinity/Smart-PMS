<?php

namespace App\Http\Controllers\StageTwo\Forms;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class SmporExcelExportController extends Controller
{
    private const BG_HDR     = 'FF1F3864';
    private const BG_SECTION = 'FF8EA9C1';
    private const FG_WHITE   = 'FFFFFFFF';
    private const FG_BLUE    = 'FF2F5597';
    private const FG_RED     = 'FFC00000';
    private const BDR        = 'FF000000';

    public function export()
    {
        $user   = auth()->user();
        $period = PerformancePeriod::current();
        abort_unless($period, 404, 'No active performance period.');

        $submission = AccomplishmentSubmission::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)->first();

        $mporIds  = $this->resolveMporIds($user, $period, $submission);
        $table    = $this->buildTable($mporIds, $period);
        $months   = $table['months'];   // ['Jan','Feb',...]
        $sections = $table['sections']; // [{type, rows}]

        $supervisor = \App\Models\User::where('office_id', $user->office_id)
            ->where('role', 'supervisor')->first();

        $ss = new Spreadsheet();
        $ws = $ss->getActiveSheet()->setTitle('SMPOR');
        $ws = $ss->getActiveSheet();

        // Columns: A=output, then per month 3 sub-cols (E/Q/T), then Total/AvgQ/AvgT
        $nMonths   = count($months);
        $ws->getColumnDimension('A')->setWidth(30);
        for ($i = 1; $i <= $nMonths * 3 + 3; $i++) {
            $ws->getColumnDimension(
                \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i + 1)
            )->setWidth(6);
        }

        $lastColIdx  = 1 + $nMonths * 3 + 3;
        $lastCol     = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($lastColIdx);
        $totalEIdx   = 1 + $nMonths * 3 + 1;
        $totalQIdx   = $totalEIdx + 1;
        $totalTIdx   = $totalEIdx + 2;
        $totalECol   = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($totalEIdx);
        $totalQCol   = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($totalQIdx);
        $totalTCol   = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($totalTIdx);

        $thin = ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR]];
        $r = 1;

        // Logo
        $logoPath = public_path('images/exports/pgds-logo.png');
        if (file_exists($logoPath)) {
            $midCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx / 2));
            (new Drawing())->setPath($logoPath)->setCoordinates("{$midCol}1")->setHeight(45)->setOffsetX(5)->setWorksheet($ws);
        }

        // Gov header
        foreach ([
            ['Republic of the Philippines', false, 10, self::FG_RED],
            ['PROVINCE OF DAVAO DEL SUR',   true,  11, self::FG_BLUE],
            ['Matti, Digos City',           false, 10, self::FG_RED],
        ] as [$text, $bold, $size, $color]) {
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", $text);
            $ws->getStyle("A{$r}")->applyFromArray([
                'font'      => ['bold' => $bold, 'size' => $size, 'color' => ['argb' => $color]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }
        $r++;

        // Title
        $ws->mergeCells("A{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", 'SUMMARY MONTHLY PERFORMANCE OUTPUT REPORT');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font'      => ['bold' => true, 'size' => 13],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(20);
        $r += 2;

        // Name / Office / Period row
        $mid1 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx * 0.55));
        $mid2 = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx * 0.55) + 1);
        $ws->mergeCells("A{$r}:{$mid1}{$r}");
        $ws->mergeCells("{$mid2}{$r}:{$lastCol}{$r}");
        $ws->setCellValue("A{$r}", "Name: _______________   Office/Division: _______________");
        $ws->setCellValue("{$mid2}{$r}", "Semestral Period: {$period->name}");
        $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
            'font'      => ['size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT],
        ]);
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // ── Column headers (3 rows) ─────────────────────────────────────────
        $hdr1 = $r; $hdr2 = $r + 1; $hdr3 = $r + 2;

        $ws->mergeCells("A{$hdr1}:A{$hdr3}");
        $ws->setCellValue("A{$hdr1}", 'EXPECTED OUTPUTS');
        $this->hCell($ws, "A{$hdr1}:A{$hdr3}");

        // EFFICIENCY | QUALITY | TIMELINESS group headers (row 1)
        $effStart = 2;
        $effEnd   = 2 + $nMonths - 1;
        $qualStart = $effEnd + 1;
        $qualEnd  = $qualStart + $nMonths - 1;
        $timeStart = $qualEnd + 1;
        $timeEnd  = $timeStart + $nMonths - 1;

        foreach ([
            [$effStart,  $effEnd,  'EFFICIENCY'],
            [$qualStart, $qualEnd, 'QUALITY'],
            [$timeStart, $timeEnd, 'TIMELINESS'],
        ] as [$si, $ei, $label]) {
            $sc = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($si);
            $ec = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($ei);
            $ws->mergeCells("{$sc}{$hdr1}:{$ec}{$hdr1}");
            $ws->setCellValue("{$sc}{$hdr1}", $label);
            $this->hCell($ws, "{$sc}{$hdr1}:{$ec}{$hdr1}");

            // Row 2: month names
            for ($mi = 0; $mi < $nMonths; $mi++) {
                $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($si + $mi);
                $ws->setCellValue("{$col}{$hdr2}", $months[$mi]);
                $this->hCell($ws, "{$col}{$hdr2}");
            }

            // Row 3: blank (sub-column label)
            for ($mi = 0; $mi < $nMonths; $mi++) {
                $col = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($si + $mi);
                $this->hCell($ws, "{$col}{$hdr3}");
            }
        }

        // Total + Avg headers
        $ws->mergeCells("{$totalECol}{$hdr1}:{$totalECol}{$hdr3}");
        $ws->setCellValue("{$totalECol}{$hdr1}", 'Total');
        $this->hCell($ws, "{$totalECol}{$hdr1}:{$totalECol}{$hdr3}");

        $ws->mergeCells("{$totalQCol}{$hdr1}:{$totalQCol}{$hdr3}");
        $ws->setCellValue("{$totalQCol}{$hdr1}", 'Average');
        $this->hCell($ws, "{$totalQCol}{$hdr1}:{$totalQCol}{$hdr3}");

        $ws->mergeCells("{$totalTCol}{$hdr1}:{$totalTCol}{$hdr3}");
        $ws->setCellValue("{$totalTCol}{$hdr1}", 'Average');
        $this->hCell($ws, "{$totalTCol}{$hdr1}:{$totalTCol}{$hdr3}");

        foreach ([$hdr1, $hdr2, $hdr3] as $hr) $ws->getRowDimension($hr)->setRowHeight(13);
        $r = $hdr3 + 1;

        // ── Data rows ────────────────────────────────────────────────────────
        foreach ($sections as $section) {
            $ws->mergeCells("A{$r}:{$lastCol}{$r}");
            $ws->setCellValue("A{$r}", strtoupper($section['type']) . ' FUNCTION');
            $ws->getStyle("A{$r}:{$lastCol}{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_WHITE]],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_SECTION]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'indent' => 1],
                'borders'   => ['allBorders' => $thin],
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;

            foreach ($section['rows'] as $row) {
                $ws->setCellValue("A{$r}", $row['output']);
                $ws->getStyle("A{$r}")->applyFromArray([
                    'font'      => ['size' => 8],
                    'alignment' => ['wrapText' => true, 'indent' => 1],
                    'borders'   => ['allBorders' => $thin],
                ]);

                for ($mi = 0; $mi < $nMonths; $mi++) {
                    $m   = $months[$mi];
                    $md  = $row['months'][$m] ?? ['qty' => 0, 'qual_pts' => 0, 'time_pts' => 0];
                    $qty = $md['qty'] ?? 0;
                    $qa  = $qty > 0 ? round($md['qual_pts'] / $qty, 2) : '';
                    $ta  = $qty > 0 ? round($md['time_pts'] / $qty, 2) : '';

                    $ec = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($effStart  + $mi);
                    $qc = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($qualStart + $mi);
                    $tc = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($timeStart + $mi);

                    foreach ([[$ec, $qty ?: ''], [$qc, $qa], [$tc, $ta]] as [$col, $val]) {
                        $ws->setCellValue("{$col}{$r}", $val);
                        $ws->getStyle("{$col}{$r}")->applyFromArray([
                            'font'      => ['size' => 8],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                            'borders'   => ['allBorders' => $thin],
                        ]);
                    }
                }

                // Totals
                $ws->setCellValue("{$totalECol}{$r}", $row['total_qty'] ?: '');
                $ws->setCellValue("{$totalQCol}{$r}", $row['avg_qual'] ?: '');
                $ws->setCellValue("{$totalTCol}{$r}", $row['avg_time'] ?: '');
                foreach ([$totalECol, $totalQCol, $totalTCol] as $col) {
                    $ws->getStyle("{$col}{$r}")->applyFromArray([
                        'font'      => ['bold' => true, 'size' => 8],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        'borders'   => ['allBorders' => $thin],
                    ]);
                }
                $ws->getRowDimension($r)->setRowHeight(20);
                $r++;
            }
        }

        // ── Signature ────────────────────────────────────────────────────────
        $r += 2;
        $third = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx / 3));
        $two3  = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx / 3) + 1);
        $two3e = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx * 2 / 3));
        $emp   = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex((int)($lastColIdx * 2 / 3) + 1);

        foreach (['Direct Supervisor', 'Department Head', "Employees' Name"] as $i => $label) {
            $sc = match($i) { 0 => 'A', 1 => $two3, 2 => $emp };
            $ec = match($i) { 0 => $third, 1 => $two3e, 2 => $lastCol };
            $ws->mergeCells("{$sc}{$r}:{$ec}{$r}");
            $ws->setCellValue("{$sc}{$r}", $label);
            $ws->getStyle("{$sc}{$r}")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 9, 'underline' => true],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
        }
        $ws->setCellValue("{$emp}{$r}", $user->name);
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // Position labels
        foreach ([['A', $third, $supervisor?->position ?? 'Position'], [$emp, $lastCol, $user->position ?? 'Position']] as [$sc, $ec, $pos]) {
            $ws->mergeCells("{$sc}{$r}:{$ec}{$r}");
            $ws->setCellValue("{$sc}{$r}", $pos);
            $ws->getStyle("{$sc}{$r}")->applyFromArray([
                'font'      => ['italic' => true, 'size' => 8, 'color' => ['argb' => self::FG_BLUE]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
        }

        // Page setup
        $ws->getPageSetup()
            ->setOrientation(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(\PhpOffice\PhpSpreadsheet\Worksheet\PageSetup::PAPERSIZE_A4)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.4)->setBottom(0.4)->setLeft(0.35)->setRight(0.35);

        $filename = 'SMPOR_' . str_replace(' ', '_', $user->name) . '_' . now()->format('Ymd') . '.xlsx';
        $writer   = new Xlsx($ss);

        return response()->streamDownload(fn() => $writer->save('php://output'), $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function resolveMporIds($user, $period, $submission): array
    {
        if ($submission && !in_array($submission->status, ['draft', 'returned_to_employee'])) {
            return $submission->mpors->pluck('id')->toArray();
        }
        $qar = QarHeader::where('office_id', $user->office_id)
            ->where('performance_period_id', $period->id)
            ->where('pmt_status', 'pmt_approved')->first();
        if ($qar) {
            $ids = QarMporLink::where('qar_header_id', $qar->id)
                ->whereHas('mpor', fn($q) => $q->where('employee_id', $user->id))
                ->pluck('mpor_id')->toArray();
            if (!empty($ids)) return $ids;
        }
        return Mpor::where('employee_id', $user->id)
            ->whereIn('status', ['submitted', 'approved', 'endorsed'])
            ->pluck('id')->toArray();
    }

    private function buildTable(array $mporIds, $period): array
    {
        if (empty($mporIds)) return ['months' => [], 'sections' => []];

        $start  = $period->start_date->copy()->startOfMonth();
        $end    = $period->end_date->copy()->endOfMonth();
        $months = [];
        for ($m = $start->copy(); $m->lte($end); $m->addMonth()) $months[] = $m->format('M');

        $entries = OrsEntry::whereIn('ipcr_item_id', function ($q) use ($mporIds) {
                $q->select('ipcr_items.id')->from('ipcr_items')
                  ->join('ipcrs', 'ipcrs.id', '=', 'ipcr_items.ipcr_id')
                  ->join('mpors', 'mpors.employee_id', '=', 'ipcrs.employee_id')
                  ->whereIn('mpors.id', $mporIds);
            })
            ->where('status', 'rated')->whereNotNull('quantity')
            ->whereBetween('work_date', [$period->start_date, $period->end_date])
            ->with(['ipcrItem.indicator.uwpMfo.uwpFunction', 'monitoring'])
            ->get();

        $sections = [];
        foreach ($entries as $entry) {
            $mfo    = $entry->ipcrItem?->indicator?->uwpMfo;
            $fn     = $mfo?->uwpFunction;
            $fnType = strtolower($fn?->name ?? 'core');
            $title  = $mfo?->title ?? 'Other';
            $month  = Carbon::parse($entry->work_date)->format('M');
            $mon    = $entry->monitoring->first();
            $qty    = (int) $entry->quantity;

            $sections[$fnType][$title][$month]['qty']      = ($sections[$fnType][$title][$month]['qty'] ?? 0) + $qty;
            $sections[$fnType][$title][$month]['qual_pts'] = ($sections[$fnType][$title][$month]['qual_pts'] ?? 0) + ($qty * ($mon?->quality_rating ?? 0));
            $sections[$fnType][$title][$month]['time_pts'] = ($sections[$fnType][$title][$month]['time_pts'] ?? 0) + ($qty * ($mon?->timeliness_rating ?? 0));
        }

        $result = [];
        foreach ($sections as $fnType => $outputs) {
            $rows = [];
            foreach ($outputs as $title => $monthData) {
                $tQty  = array_sum(array_column($monthData, 'qty'));
                $tQual = array_sum(array_column($monthData, 'qual_pts'));
                $tTime = array_sum(array_column($monthData, 'time_pts'));
                $row   = ['output' => $title, 'months' => [], 'total_qty' => $tQty,
                    'avg_qual' => $tQty > 0 ? round($tQual / $tQty, 2) : 0,
                    'avg_time' => $tQty > 0 ? round($tTime / $tQty, 2) : 0];
                foreach ($months as $m) $row['months'][$m] = $monthData[$m] ?? ['qty' => 0, 'qual_pts' => 0, 'time_pts' => 0];
                $rows[] = $row;
            }
            $result[] = ['type' => $fnType, 'rows' => $rows];
        }
        return ['months' => $months, 'sections' => $result];
    }

    private function hCell($ws, string $range): void
    {
        $ws->getStyle($range)->applyFromArray([
            'font'      => ['bold' => true, 'size' => 8, 'color' => ['argb' => self::FG_WHITE]],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_HDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR]]],
        ]);
    }
}
