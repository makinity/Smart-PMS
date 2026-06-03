<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OrsEntry extends Model
{
    protected $table = 'ors_entries';

    protected $fillable = [
        'employee_id',
        'supervisor_id',
        'office_id',
        'performance_period_id',
        'ipcr_id',
        'ipcr_item_id',
        'mpor_id',
        'work_date',
        'notes',
        'quantity',
        'started_at',
        'stopped_at',
        'total_seconds',
        'status',
        'submitted_at',
        'locked_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'stopped_at' => 'datetime',
        'submitted_at' => 'datetime',
        'locked_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function ipcr(): BelongsTo
    {
        return $this->belongsTo(Ipcr::class, 'ipcr_id');
    }

    public function ipcrItem(): BelongsTo
    {
        return $this->belongsTo(IpcrItem::class, 'ipcr_item_id');
    }

    public function mpor(): BelongsTo
    {
        return $this->belongsTo(Mpor::class, 'mpor_id');
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(OrsEntryEvidence::class, 'ors_entry_id');
    }

    public function monitoring(): HasOne
    {
        return $this->hasOne(OrsEntryMonitoring::class, 'ors_entry_id');
    }

    public function isLocked(): bool
    {
        return !is_null($this->locked_at);
    }

    public function isSubmitted(): bool
    {
        return in_array(strtolower((string) $this->status), ['submitted', 'rated'], true);
    }

    public function isDraft(): bool
    {
        return strtolower((string) $this->status) === 'draft';
    }
}
