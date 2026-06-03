<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MyTask extends Model
{
    protected $table = 'my_tasks';

    protected $fillable = [
        'ors_entry_id',
        'employee_id',
        'office_id',
        'performance_period_id',
        'ipcr_id',
        'ipcr_item_id',
        'work_date',
        'notes',
        'quantity',
        'started_at',
        'stopped_at',
        'total_seconds',
        'status',
        'submitted_at',
        'locked_at',
        'has_evidence',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'stopped_at' => 'datetime',
        'submitted_at' => 'datetime',
        'locked_at' => 'datetime',
        'has_evidence' => 'boolean',
    ];

    public function orsEntry(): BelongsTo
    {
        return $this->belongsTo(OrsEntry::class, 'ors_entry_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function ipcrItem(): BelongsTo
    {
        return $this->belongsTo(IpcrItem::class, 'ipcr_item_id');
    }
}
