<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class QarHeader extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_DEPT_HEAD_ENDORSED = 'dept_head_endorsed';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_PMT_APPROVED = 'pmt_approved';

    public const PMT_PENDING = 'pending';
    public const PMT_VALIDATED = 'validated';
    public const PMT_RETURNED = 'returned';

    protected $table = 'qar_headers';

    protected $fillable = [
        'office_id',
        'performance_period_id',
        'quarter_key',
        'status',
        'generated_at',
        'generated_by',
        'approved_at',
        'approved_by',
        'pmt_status',
        'pmt_validated_at',
        'pmt_validated_by',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'approved_at' => 'datetime',
        'pmt_validated_at' => 'datetime',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function pmtValidator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pmt_validated_by');
    }

    public function mporLinks(): HasMany
    {
        return $this->hasMany(QarMporLink::class);
    }

    public function rows(): HasMany
    {
        return $this->hasMany(QarRow::class)->orderBy('sort_order');
    }

    public function smpor(): HasOne
    {
        return $this->hasOne(Smpor::class, 'qar_header_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isEndorsedByDeptHead(): bool
    {
        return $this->status === self::STATUS_DEPT_HEAD_ENDORSED;
    }

    public function isPmtApproved(): bool
    {
        return $this->status === self::STATUS_PMT_APPROVED;
    }

    public function isReturned(): bool
    {
        return $this->status === self::STATUS_RETURNED;
    }

    public function isPmtValidated(): bool
    {
        return $this->pmt_status === self::PMT_VALIDATED;
    }

    public function isLockedForDeptHead(): bool
    {
        return in_array($this->status, [self::STATUS_DEPT_HEAD_ENDORSED, self::STATUS_PMT_APPROVED], true);
    }
}
