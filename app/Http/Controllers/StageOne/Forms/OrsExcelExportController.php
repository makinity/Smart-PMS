<?php

namespace App\Http\Controllers\StageOne\Forms;

use App\Http\Controllers\Controller;
use App\Models\OrsEntry;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class OrsExcelExportController extends Controller
{
    public function export(Request $request)
    {
        $entry = OrsEntry::with([
            'employee:id,name',
            'ipcrItem.indicator.uwpMfo:id,title',
            'monitoring',
        ])->findOrFail($request->query('ors_id', 0));

        abort_unless(
            auth()->id() === $entry->employee_id || auth()->id() === $entry->supervisor_id,
            403
        );
        abort_unless($entry->status === 'rated', 403, 'Only validated ORS entries can be exported.');

        $mon        = $entry->monitoring->first();
        $employee   = $entry->employee?->name ?? '—';
        $output     = $entry->ipcrItem?->indicator?->uwpMfo?->title ?? '—';
        $submitted  = $entry->submitted_at?->format('F j, Y') ?? '—';
        $quantity   = $entry->quantity ?? '—';
        $quality    = $mon?->quality_rating ?? '—';
        $timeliness = $mon?->timeliness_rating ?? '—';
        $remarks    = $mon?->remarks ?? '';
        $ratedAt    = $mon?->updated_at?->format('F j, Y') ?? '—';

        $ss = IOFactory::load(public_path('form/Annex G_ Output Rating Sheet.xlsx'));
        $ws = $ss->getActiveSheet();

        // Fill value cells (first bottom-bordered cell in each field row)
        $ws->setCellValue('D10', $employee);
        $ws->setCellValue('D11', $output);
        $ws->setCellValue('F12', $submitted);
        $ws->setCellValue('E14', $quantity);
        $ws->setCellValue('E15', $quality);
        $ws->setCellValue('E16', $timeliness);
        $ws->setCellValue('D18', $remarks);
        $ws->getStyle('D18')->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);
        $ws->setCellValue('E24', $ratedAt);

        $writer   = new Xlsx($ss);
        $filename = 'ORS_' . str_replace(' ', '_', $employee) . '_' . now()->format('Ymd') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
