<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\OrsEntry;
use App\Models\OrsEntryMonitoring;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class OrsMonitoringController extends Controller
{
    public function index(Request $request)
    {
        $supervisor = auth()->user();

        $entries = OrsEntry::where('supervisor_id', $supervisor->id)
            ->whereIn('status', ['submitted', 'rated'])
            ->with(['employee', 'ipcrItem.indicator.uwpMfo', 'evidences', 'monitoring' => fn($q) => $q->where('supervisor_id', $supervisor->id)])
            ->orderByDesc('submitted_at')
            ->get()
            ->map(fn($e) => $this->formatEntry($e));

        return Inertia::render('Supervisor/OrsMonitoring/Index', [
            'entries'         => $entries,
            'autoOpenEntryId' => $request->integer('ors_entry_id') ?: null,
        ]);
    }

    public function rate(Request $request, OrsEntry $orsEntry)
    {
        $supervisor = auth()->user();
        abort_if($orsEntry->supervisor_id !== $supervisor->id, 403);
        abort_if(! in_array($orsEntry->status, ['submitted', 'rated']), 422);

        $data = $request->validate([
            'quality_rating'    => ['required', 'integer', 'min:1', 'max:5'],
            'timeliness_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'remarks'           => ['nullable', 'string', 'max:2000'],
        ]);

        OrsEntryMonitoring::updateOrCreate(
            ['ors_entry_id' => $orsEntry->id, 'supervisor_id' => $supervisor->id],
            [...$data, 'rated_at' => now()]
        );

        $orsEntry->update(['status' => 'rated']);

        // Notify employee
        $orsEntry->employee->notify(new WorkflowEventNotification(
            type:    'success',
            event:   'ors.rated_by_supervisor',
            message: "Your task has been rated by {$supervisor->name}: {$orsEntry->ipcrItem?->indicator?->indicator_text}",
            url:     route('employee.ors.index') . "?ors_entry_id={$orsEntry->id}",
        ));

        return back()->with('success', 'Rating saved.');
    }

    private function formatEntry(OrsEntry $e): array
    {
        $mon = $e->monitoring->first();
        return [
            'id'               => $e->id,
            'work_date'        => $e->work_date->toDateString(),
            'status'           => $e->status,
            'submitted_at'     => $e->submitted_at?->toIso8601String(),
            'total_seconds'    => $e->total_seconds,
            'quantity'         => $e->quantity,
            'notes'            => $e->notes,
            'indicator_text'   => $e->ipcrItem?->indicator?->indicator_text ?? '—',
            'output_title'     => $e->ipcrItem?->indicator?->uwpMfo?->title ?? '—',
            'employee_name'    => $e->employee?->name ?? '—',
            'evidence_count'   => $e->evidences->count(),
            'evidences'        => $e->evidences->map(fn($ev) => [
                'id'        => $ev->id,
                'file_name' => $ev->file_name,
                'file_path' => Storage::url($ev->file_path),
                'file_size' => $ev->file_size,
            ])->toArray(),
            'rating' => $mon ? [
                'quality_rating'    => $mon->quality_rating,
                'timeliness_rating' => $mon->timeliness_rating,
                'remarks'           => $mon->remarks,
                'rated_at'          => $mon->rated_at?->toIso8601String(),
            ] : null,
        ];
    }
}
