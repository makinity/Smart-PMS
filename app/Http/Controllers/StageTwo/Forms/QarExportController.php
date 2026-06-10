<?php

namespace App\Http\Controllers\StageTwo\Forms;

use App\Http\Controllers\Controller;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\User;
use App\Services\QarConsolidationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class QarExportController extends Controller
{
    private const FG_BLACK = 'FF000000';

    private const BG_HDR = 'FFD6E4F0'; // light navy - column header fill

    private const BDR_BLACK = 'FF000000';

    private const LAST_COL = 'G';

    private const MIN_ROWS = 12; // pad to keep the printed form full

    public function export(Request $request, QarConsolidationService $svc)
    {
        // ── Resolve data source: saved header (?qar=) or live quarter (?q=) ──────
        $qarId = $request->query('qar');

        if ($qarId) {
            $header = QarHeader::with(['office', 'rows' => fn ($q) => $q->orderBy('sort_order')])
                ->findOrFail($qarId);

            $office = $header->office;
            $quarterKey = $header->quarter_key;
            $rows = $header->rows->map(fn ($r) => [
                'ppa_code' => $r->ppa_code,
                'mfo_title' => $r->mfo_title,
                'indicator_text' => $r->indicator_text,
                'target_quantity' => $r->target_quantity,
                'target_timeline' => $r->target_timeline,
                'actual_performance' => $r->actual_performance,
                'variance' => $r->variance,
                'remarks' => $r->remarks,
            ])->all();
        } else {
            $user = auth()->user();
            $period = PerformancePeriod::current();
            abort_unless($period, 404, 'No active performance period.');

            $q = (int) $request->query('q', 1);
            if ($q < 1 || $q > 2) {
                $q = 1;
            }

            $office = $user->office;
            $quarterKey = $svc->quarterKey($period, $q);
            $rows = $svc->consolidate($user->office_id, $period, $q)['rows'];
        }

        // Derive year + quarter number from "YYYY-Q{n}"
        [$yearPart, $qPart] = array_pad(explode('-Q', $quarterKey), 2, '1');
        $year = (int) $yearPart;
        $qNum = (int) $qPart;
        $endDate = Carbon::create($year, $qNum * 3, 1)->endOfMonth();

        // Department head who prepares the report
        $deptHead = $office
            ? User::where('office_id', $office->id)->where('role', 'dept-head')->first()
            : null;

        // ── Build spreadsheet ──────────────────────────────────────────────────
        $ss = new Spreadsheet;
        $ws = $ss->getActiveSheet();
        $ws->setTitle('QAR Annex I');

        // Column widths (A4 portrait): PPA | MFO/PPA | Indicator | Target | Actual | Variance | Remarks
        foreach (['A' => 10, 'B' => 22, 'C' => 28, 'D' => 18, 'E' => 14, 'F' => 11, 'G' => 18] as $col => $w) {
            $ws->getColumnDimension($col)->setWidth($w);
        }

        $r = 1;

        // ── Form identifier (top-right) ─────────────────────────────────────────
        foreach (['Office Quarterly Accomplishment Report Form', 'LBAC Form No. 3'] as $i => $text) {
            $ws->mergeCells("D{$r}:".self::LAST_COL."{$r}");
            $ws->setCellValue("D{$r}", $text);
            $ws->getStyle("D{$r}")->applyFromArray([
                'font' => ['bold' => $i === 1, 'size' => 9, 'color' => ['argb' => self::FG_BLACK]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $ws->getRowDimension($r)->setRowHeight(14);
            $r++;
        }

        // Spacer
        $ws->getRowDimension($r)->setRowHeight(6);
        $r++;

        // ── Title ───────────────────────────────────────────────────────────────
        $ws->mergeCells("A{$r}:".self::LAST_COL."{$r}");
        $ws->setCellValue("A{$r}", 'QUARTERLY PHYSICAL REPORT OF OPERATIONS');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 13, 'color' => ['argb' => self::FG_BLACK]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(20);
        $r++;

        // Quarter ending
        $ws->mergeCells("A{$r}:".self::LAST_COL."{$r}");
        $ws->setCellValue("A{$r}", 'For the Quarter Ending '.$endDate->format('F j, Y'));
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['argb' => self::FG_BLACK]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);
        $r++;

        // Spacer
        $ws->getRowDimension($r)->setRowHeight(8);
        $r++;

        // ── Department / Office ────────────────────────────────────────────────
        $ws->mergeCells("A{$r}:".self::LAST_COL."{$r}");
        $ws->setCellValue("A{$r}", 'Department/Office:   '.strtoupper($office?->name ?? ''));
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10, 'underline' => true],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(18);
        $r++;

        // Spacer
        $ws->getRowDimension($r)->setRowHeight(4);
        $r++;

        // ── Column headers ─────────────────────────────────────────────────────
        $headers = [
            'A' => 'PPA Code',
            'B' => 'MFO/PPA',
            'C' => 'Performance Indicator',
            'D' => 'Target Output',
            'E' => 'Actual Performance',
            'F' => 'Variance',
            'G' => 'Remarks',
        ];
        foreach ($headers as $col => $label) {
            $ws->setCellValue("{$col}{$r}", $label);
        }
        $ws->getStyle("A{$r}:".self::LAST_COL."{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['argb' => self::FG_BLACK]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::BG_HDR]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(28);
        $r++;

        // ── Data rows ──────────────────────────────────────────────────────────
        $rowCount = 0;
        foreach ($rows as $row) {
            $target = $row['target_quantity'] !== null ? rtrim(rtrim((string) $row['target_quantity'], '0'), '.') : '';
            if ($row['target_timeline']) {
                $target = trim($target."\n".$row['target_timeline']);
            }
            $variance = $row['variance'] === null
                ? ''
                : ($row['variance'] >= 0 ? '+'.$this->num($row['variance']) : $this->num($row['variance']));

            $ws->setCellValue("A{$r}", $row['ppa_code']);
            $ws->setCellValue("B{$r}", $row['mfo_title']);
            $ws->setCellValue("C{$r}", $row['indicator_text']);
            $ws->setCellValueExplicit("D{$r}", $target, DataType::TYPE_STRING);
            $ws->setCellValue("E{$r}", $row['actual_performance']);
            $ws->setCellValue("F{$r}", $variance);
            $ws->setCellValue("G{$r}", $row['remarks']);

            $this->dataRowStyle($ws, $r);
            $ws->getRowDimension($r)->setRowHeight(max(26, (int) ceil(mb_strlen((string) $row['indicator_text']) / 30) * 13));
            $r++;
            $rowCount++;
        }

        // Pad with empty bordered rows to keep the form full
        for (; $rowCount < self::MIN_ROWS; $rowCount++) {
            $this->dataRowStyle($ws, $r);
            $ws->getRowDimension($r)->setRowHeight(20);
            $r++;
        }

        // Spacer
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // ── Signature block ────────────────────────────────────────────────────
        $ws->setCellValue("A{$r}", 'Prepared by:');
        $ws->getStyle("A{$r}")->applyFromArray([
            'font' => ['size' => 10],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);
        $r += 3; // blank space for signatures

        // Name line (dept head on the left)
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:".self::LAST_COL."{$r}");
        $ws->setCellValue("A{$r}", strtoupper($deptHead?->name ?? ''));
        $ws->getStyle("A{$r}:".self::LAST_COL."{$r}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 10],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);
        $r++;

        // Role labels
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:".self::LAST_COL."{$r}");
        $ws->setCellValue("A{$r}", 'Department Head');
        $ws->setCellValue("D{$r}", 'Local Planning and Development Coordinator');
        $ws->getStyle("A{$r}:".self::LAST_COL."{$r}")->applyFromArray([
            'font' => ['size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(14);
        $r++;

        // Date labels
        $ws->mergeCells("A{$r}:C{$r}");
        $ws->mergeCells("D{$r}:".self::LAST_COL."{$r}");
        $ws->setCellValue("A{$r}", 'Date: _______________');
        $ws->setCellValue("D{$r}", 'Date: _______________');
        $ws->getStyle("A{$r}:".self::LAST_COL."{$r}")->applyFromArray([
            'font' => ['size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $ws->getRowDimension($r)->setRowHeight(16);

        // ── Page setup ─────────────────────────────────────────────────────────
        $ws->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
            ->setPaperSize(PageSetup::PAPERSIZE_A4)
            ->setFitToPage(true)->setFitToWidth(1)->setFitToHeight(0);
        $ws->getPageMargins()->setTop(0.5)->setBottom(0.5)->setLeft(0.4)->setRight(0.4);

        $safeName = preg_replace('/[^A-Za-z0-9_\-\.]/', '_',
            'QAR_'.($office?->name ?? 'Office').'_'.$quarterKey.'.xlsx');

        $writer = new Xlsx($ss);

        return response()->streamDownload(fn () => $writer->save('php://output'), $safeName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    private function dataRowStyle($ws, int $r): void
    {
        $ws->getStyle("A{$r}:".self::LAST_COL."{$r}")->applyFromArray([
            'font' => ['size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::BDR_BLACK]]],
        ]);
        // Left-align the descriptive columns
        foreach (['B', 'C', 'G'] as $col) {
            $ws->getStyle("{$col}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        }
    }

    private function num($v): string
    {
        return rtrim(rtrim(number_format((float) $v, 2, '.', ''), '0'), '.');
    }
}
