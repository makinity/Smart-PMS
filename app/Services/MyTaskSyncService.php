<?php

namespace App\Services;

use App\Models\MyTask;
use App\Models\OrsEntry;

class MyTaskSyncService
{
    public function syncFromOrsEntry(OrsEntry $entry): MyTask
    {
        $entry->loadMissing('evidences');

        return MyTask::query()->updateOrCreate(
            ['ors_entry_id' => $entry->id],
            [
                'employee_id' => $entry->employee_id,
                'office_id' => $entry->office_id,
                'performance_period_id' => $entry->performance_period_id,
                'ipcr_id' => $entry->ipcr_id,
                'ipcr_item_id' => $entry->ipcr_item_id,
                'work_date' => $entry->work_date,
                'notes' => $entry->notes,
                'quantity' => $entry->quantity,
                'started_at' => $entry->started_at,
                'stopped_at' => $entry->stopped_at,
                'total_seconds' => (int) ($entry->total_seconds ?? 0),
                'status' => $entry->status,
                'submitted_at' => $entry->submitted_at,
                'locked_at' => $entry->locked_at,
                'has_evidence' => $entry->evidences()->exists(),
            ]
        );
    }
}
