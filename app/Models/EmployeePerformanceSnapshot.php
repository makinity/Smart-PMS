<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePerformanceSnapshot extends Model
{
    protected $fillable = [
        'employee_id', 'performance_period_id', 'ipcr_id',
        'indicator_text', 'function_type', 'mfo_title',
        'target_quantity', 'target_timeline_days',
        'office_size', 'employee_count_assigned',
        'final_score', 'adjectival_rating',
    ];

    protected $casts = [
        'final_score' => 'decimal:2',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function ipcr(): BelongsTo
    {
        return $this->belongsTo(Ipcr::class);
    }
}
