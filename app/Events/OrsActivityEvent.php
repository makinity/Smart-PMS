<?php

namespace App\Events;

use App\Models\Employee;
use App\Models\OrsEntry;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class OrsActivityEvent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public array $entry;

    /** Supervisor user IDs to broadcast to (selected + all in same office). */
    private array $supervisorIds;

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

        // Broadcast to: the employee's selected supervisor + every other supervisor
        // in the same office (so Team Task Monitor updates for all of them).
        $officeId = $orsEntry->employee?->employee?->office_id;

        $officeSupervisorIds = $officeId
            ? User::where('role', 'supervisor')
                ->whereHas('employee', fn ($q) => $q->where('office_id', $officeId)->where('is_active', true))
                ->pluck('id')
                ->toArray()
            : [];

        // Always include the explicitly selected supervisor even if office lookup fails.
        $this->supervisorIds = array_values(array_unique(
            array_filter(array_merge($officeSupervisorIds, [$orsEntry->supervisor_id]))
        ));
    }

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('App.Models.User.' . $this->entry['employee_id']),
        ];

        foreach ($this->supervisorIds as $supervisorId) {
            $channels[] = new PrivateChannel('supervisor.' . $supervisorId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'ors.activity';
    }
}
