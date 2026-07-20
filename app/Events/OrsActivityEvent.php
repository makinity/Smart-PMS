<?php

namespace App\Events;

use App\Models\OrsEntry;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class OrsActivityEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public array $entry;

    public function __construct(OrsEntry $orsEntry)
    {
        $orsEntry->load(['ipcrItem.indicator.uwpMfo', 'employee.employee.office', 'evidences', 'monitoring']);

        $this->entry = [
            'id'             => $orsEntry->id,
            'employee_id'    => $orsEntry->employee_id,
            'supervisor_id'  => $orsEntry->supervisor_id,
            'employee_name'  => $orsEntry->employee?->name ?? '—',
            'employee_avatar'=> $orsEntry->employee?->profile_photo_url,
            'indicator'      => $orsEntry->ipcrItem?->indicator?->indicator_text ?? '—',
            'output_title'   => $orsEntry->ipcrItem?->indicator?->uwpMfo?->title ?? '—',
            'indicator_text' => $orsEntry->ipcrItem?->indicator?->indicator_text ?? '—',
            'status'         => $orsEntry->status,
            'work_date'      => $orsEntry->work_date?->toDateString(),
            'quantity'       => $orsEntry->quantity,
            'total_seconds'  => $orsEntry->total_seconds,
            'started_at'     => $orsEntry->started_at?->toIso8601String(),
            'notes'          => $orsEntry->notes,
            'submitted_at'   => $orsEntry->submitted_at?->toIso8601String(),
            'locked_at'      => $orsEntry->locked_at?->toIso8601String(),
            'evidence_count' => $orsEntry->evidences->count(),
            'evidences'      => $orsEntry->evidences->map(fn($ev) => [
                'id'        => $ev->id,
                'file_name' => $ev->file_name,
                'file_path' => \Illuminate\Support\Facades\Storage::url($ev->file_path),
                'file_size' => $ev->file_size,
            ])->toArray(),
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('supervisor.' . $this->entry['supervisor_id']),
            new PrivateChannel('App.Models.User.' . $this->entry['employee_id']),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ors.activity';
    }
}
