<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrsEntry extends Model
{
    protected $fillable = [
        'employee_id', 'supervisor_id', 'performance_period_id',
        'ipcr_id', 'ipcr_item_id', 'work_date', 'notes',
        'quantity', 'started_at', 'stopped_at', 'total_seconds',
        'status', 'submitted_at', 'locked_at',
    ];

    protected $casts = [
        'work_date'    => 'date',
        'started_at'   => 'datetime',
        'stopped_at'   => 'datetime',
        'submitted_at' => 'datetime',
        'locked_at'    => 'datetime',
    ];

    public function employee(): BelongsTo   { return $this->belongsTo(User::class, 'employee_id'); }
    public function supervisor(): BelongsTo { return $this->belongsTo(User::class, 'supervisor_id'); }
    public function period(): BelongsTo     { return $this->belongsTo(PerformancePeriod::class, 'performance_period_id'); }
    public function ipcr(): BelongsTo       { return $this->belongsTo(Ipcr::class); }
    public function ipcrItem(): BelongsTo   { return $this->belongsTo(IpcrItem::class, 'ipcr_item_id'); }
    public function evidences(): HasMany    { return $this->hasMany(OrsEntryEvidence::class); }
    public function monitoring(): HasMany   { return $this->hasMany(OrsEntryMonitoring::class); }

    /** Live elapsed seconds including currently-running timer. */
    public function getLiveSecondsAttribute(): int
    {
        $total = $this->total_seconds;
        if ($this->status === 'recording' && $this->started_at) {
            $total += now()->diffInSeconds($this->started_at);
        }
        return $total;
    }

    public function isLocked(): bool
    {
        return in_array($this->status, ['submitted', 'rated']) || $this->locked_at !== null;
    }
}
