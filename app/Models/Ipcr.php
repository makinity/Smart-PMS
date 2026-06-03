<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ipcr extends Model
{
    protected $table = 'ipcrs';

    public const STATUS_FOR_COMMITMENT = 'for_commitment';
    public const STATUS_COMMITTED = 'committed';
    // Legacy alias for compatibility.
    public const STATUS_GENERATED = self::STATUS_FOR_COMMITMENT;

    public const STATUS_PENDING_PMT_CALIBRATION = 'pending_pmt_calibration';
    public const STATUS_RETURNED_BY_PMT = 'returned_by_pmt';
    public const STATUS_APPROVED_BY_PMT = 'approved_by_pmt';
    public const STATUS_ADJUSTED_BY_PMT = 'adjusted_by_pmt';
    public const STATUS_RELEASED_BY_PMT = 'released_by_pmt';

    protected $fillable = [
        'opcr_id',
        'unit_work_plan_id',
        'employee_id',
        'performance_period_id',
        'office_id',
        'status',
        'generated_at',
        'committed_at',
        'locked_at',
        'finalized_from_qar_header_id',
        'finalized_at',
        'final_score',
        'adjectival_rating',
        'pmt_adjusted_score',
        'pmt_adjusted_rating',
        'pmt_adjustment_reason',
        'pmt_remarks',
        'pmt_reviewed_by',
        'pmt_reviewed_at',
        'released_by',
        'released_at',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'committed_at' => 'datetime',
        'locked_at' => 'datetime',
        'finalized_at' => 'datetime',
        'pmt_reviewed_at' => 'datetime',
        'released_at' => 'datetime',
        'final_score' => 'decimal:2',
        'pmt_adjusted_score' => 'decimal:2',
    ];

    public function opcr(): BelongsTo
    {
        return $this->belongsTo(Opcr::class, 'opcr_id');
    }

    public function unitWorkPlan(): BelongsTo
    {
        return $this->belongsTo(UnitWorkPlan::class, 'unit_work_plan_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function finalizedFromQarHeader(): BelongsTo
    {
        return $this->belongsTo(QarHeader::class, 'finalized_from_qar_header_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(IpcrItem::class, 'ipcr_id');
    }

    public function ipcrItems(): HasMany
    {
        return $this->hasMany(IpcrItem::class, 'ipcr_id');
    }

    public function accomplishmentSubmission()
    {
        return $this->hasOne(AccomplishmentSubmission::class, 'ipcr_id');
    }

    public function isLocked(): bool
    {
        return !is_null($this->locked_at);
    }

    public function isFinalized(): bool
    {
        return !is_null($this->finalized_at);
    }

    public function employeeMpors(): HasMany
    {
        return $this->hasMany(Mpor::class, 'employee_id', 'employee_id')
            ->where('office_id', $this->office_id)
            ->whereBetween('month', [$this->performancePeriod->start_month, $this->performancePeriod->end_month]);
    }

    public function pmtReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pmt_reviewed_by');
    }

    public function isPmtApproved(): bool
    {
        return in_array($this->status, [self::STATUS_APPROVED_BY_PMT, self::STATUS_ADJUSTED_BY_PMT, self::STATUS_RELEASED_BY_PMT], true);
    }

    public function isPmtAdjusted(): bool
    {
        return $this->status === self::STATUS_ADJUSTED_BY_PMT;
    }

    public function isReleasedByPmt(): bool
    {
        return $this->status === self::STATUS_RELEASED_BY_PMT;
    }
}
