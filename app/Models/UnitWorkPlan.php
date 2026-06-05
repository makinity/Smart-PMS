<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class UnitWorkPlan extends Model
{
    // Status constants
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_CONSOLIDATED = 'consolidated';
    public const STATUS_ENDORSED = 'endorsed';
    public const STATUS_PMT_APPROVED = 'pmt_approved';
    public const STATUS_RETURNED = 'returned';

    protected $fillable = [
        'office_id',
        'performance_period_id',
        'created_by',
        'ratee_name',       // name of the employee being rated
        'period_covered',   // e.g. "January – June 2026"
        'pgdh_name',        // approving PGDH name
        'status',
        'submitted_at',
        'endorsed_at',
        'approved_at',
        'locked_at',
        'return_remarks',
        'returned_by',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'endorsed_at'  => 'datetime',
        'approved_at'  => 'datetime',
        'returned_at'  => 'datetime',
        'locked_at'    => 'datetime',
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function returnedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_by');
    }

    public function getDepartmentHeadAttribute(): ?User
    {
        return $this->office?->head;
    }

    public function uwpFunctions(): HasMany
    {
        return $this->hasMany(UwpFunction::class, 'unit_work_plan_id');
    }

    public function mfos(): HasManyThrough
    {
        return $this->hasManyThrough(
            UwpMfo::class,
            UwpFunction::class,
            'unit_work_plan_id',
            'uwp_function_id',
            'id',
            'id'
        );
    }

    public function getAssignmentsAttribute()
    {
        $this->loadMissing('uwpFunctions.mfos.successIndicators.assignments.employee');

        return $this->uwpFunctions
            ->flatMap(fn ($function) => $function->mfos)
            ->flatMap(fn ($mfo) => $mfo->successIndicators)
            ->flatMap(fn ($indicator) => $indicator->assignments)
            ->unique('employee_id')
            ->values();
    }

    public function opcr(): HasOne
    {
        return $this->hasOne(Opcr::class, 'unit_work_plan_id');
    }

    public function opcrs(): BelongsToMany
    {
        return $this->belongsToMany(Opcr::class, 'opcr_unit_work_plan', 'unit_work_plan_id', 'opcr_id')
            ->withTimestamps();
    }

    public function isLocked(): bool
    {
        return !is_null($this->locked_at);
    }

    public function isDraft(): bool
    {
        return strtolower((string) $this->status) === self::STATUS_DRAFT;
    }

    public function isReturned(): bool
    {
        return strtolower((string) $this->status) === self::STATUS_RETURNED;
    }

    public function isEditableBySupervisor(): bool
    {
        if ($this->isLocked()) {
            return false;
        }

        return in_array(
            strtolower((string) $this->status),
            [self::STATUS_DRAFT, self::STATUS_RETURNED],
            true
        );
    }
}
