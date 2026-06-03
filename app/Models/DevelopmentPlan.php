<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevelopmentPlan extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING_DETAILS = 'pending_details';
    public const STATUS_SUBMITTED_TO_LD = 'submitted_to_ld';
    public const LND_SYNC_NOT_SENT = 'not_sent';
    public const LND_SYNC_SENT = 'sent';
    public const LND_SYNC_ACKNOWLEDGED = 'acknowledged';
    public const LND_SYNC_FAILED = 'failed';

    protected $fillable = [
        'ipcr_id',
        'employee_id',
        'office_id',
        'performance_period_id',
        'source_score',
        'source_rating',
        'status',
        'pmt_remarks',
        'created_by',
        'updated_by',
        'submitted_to_ld_at',
        'lnd_sync_status',
        'lnd_reference_id',
        'lnd_synced_at',
        'lnd_last_error',
    ];

    protected $casts = [
        'source_score' => 'decimal:2',
        'submitted_to_ld_at' => 'datetime',
        'lnd_synced_at' => 'datetime',
    ];

    public function ipcr(): BelongsTo
    {
        return $this->belongsTo(Ipcr::class, 'ipcr_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
