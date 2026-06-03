<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Opcr extends Model
{
    protected $table = 'opcrs';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_ENDORSED = 'endorsed';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_APPROVED = 'approved';

    public const STATUS_PENDING_PMT_CALIBRATION = 'pending_pmt_calibration';
    public const STATUS_RETURNED_BY_PMT = 'returned_by_pmt';
    public const STATUS_APPROVED_BY_PMT = 'approved_by_pmt';
    public const STATUS_ADJUSTED_BY_PMT = 'adjusted_by_pmt';
    public const STATUS_RELEASED_BY_PMT = 'released_by_pmt';

    // Legacy constants kept for compatibility with existing callers.
    public const STATUS_FOR_REVIEW = 'for_dept_head_review';

    protected $fillable = [
        'unit_work_plan_id',
        'office_id',
        'performance_period_id',
        'generated_by',
        'status',
        'submitted_at',
        'approved_by',
        'approved_at',
        'returned_at',
        'remarks',
        'locked_at',
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
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'returned_at' => 'datetime',
        'locked_at' => 'datetime',
        'pmt_reviewed_at' => 'datetime',
        'released_at' => 'datetime',
        'final_score' => 'decimal:2',
        'pmt_adjusted_score' => 'decimal:2',
    ];

    public function unitWorkPlan(): BelongsTo
    {
        return $this->belongsTo(UnitWorkPlan::class, 'unit_work_plan_id');
    }

    public function unitWorkPlans(): BelongsToMany
    {
        return $this->belongsToMany(UnitWorkPlan::class, 'opcr_unit_work_plan', 'opcr_id', 'unit_work_plan_id')
            ->withTimestamps();
    }

    public function sourceUnitWorkPlans()
    {
        if ($this->relationLoaded('unitWorkPlans') && $this->unitWorkPlans->isNotEmpty()) {
            return $this->unitWorkPlans;
        }

        if ($this->relationLoaded('unitWorkPlan') && $this->unitWorkPlan) {
            return collect([$this->unitWorkPlan]);
        }

        $sources = $this->unitWorkPlans()->get();
        if ($sources->isNotEmpty()) {
            return $sources;
        }

        $legacy = $this->unitWorkPlan()->first();
        return $legacy ? collect([$legacy]) : collect();
    }

    public function uwp(): BelongsTo
    {
        return $this->unitWorkPlan();
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function ipcrs(): HasMany
    {
        return $this->hasMany(Ipcr::class, 'opcr_id');
    }

    public function isLocked(): bool
    {
        return !is_null($this->locked_at);
    }

    public function isDraft(): bool
    {
        return strtolower((string) $this->status) === self::STATUS_DRAFT;
    }

    public function isSubmitted(): bool
    {
        return strtolower((string) $this->status) === self::STATUS_SUBMITTED;
    }

    public function isReturned(): bool
    {
        return strtolower((string) $this->status) === self::STATUS_RETURNED;
    }

    public function isApproved(): bool
    {
        return strtolower((string) $this->status) === self::STATUS_APPROVED;
    }

    public function isEditable(): bool
    {
        if ($this->isLocked()) {
            return false;
        }

        return $this->isDraft() || $this->isReturned();
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
