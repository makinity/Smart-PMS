<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TopPerformer extends Model
{
    public const TYPE_EMPLOYEE = 'employee';
    public const TYPE_OFFICE = 'office';

    protected $fillable = [
        'performer_type',
        'source_record_id',
        'ipcr_id',
        'opcr_id',
        'employee_id',
        'office_id',
        'performance_period_id',
        'rank',
        'performer_name',
        'surname',
        'given_name',
        'middle_name',
        'name_extension',
        'designation',
        'office_name',
        'department_head_name',
        'official_score',
        'official_rating',
        'remarks',
        'released_at',
    ];

    protected $casts = [
        'official_score' => 'decimal:2',
        'released_at' => 'datetime',
    ];

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function ipcr(): BelongsTo
    {
        return $this->belongsTo(Ipcr::class, 'ipcr_id');
    }

    public function opcr(): BelongsTo
    {
        return $this->belongsTo(Opcr::class, 'opcr_id');
    }
}
