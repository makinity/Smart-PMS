<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Smpor extends Model
{
    protected $table = 'smpors';

    protected $fillable = [
        'qar_header_id',
        'office_id',
        'performance_period_id',
        'quarter_key',
        'generated_at',
        'generated_by',
        'avg_quality',
        'avg_timeliness',
        'overall_score',
        'adjectival_rating',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'avg_quality' => 'decimal:2',
        'avg_timeliness' => 'decimal:2',
        'overall_score' => 'decimal:2',
    ];

    public function qarHeader(): BelongsTo
    {
        return $this->belongsTo(QarHeader::class, 'qar_header_id');
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

    public function items(): HasMany
    {
        return $this->hasMany(SmporItem::class, 'smpor_id')->orderBy('overall_score', 'desc');
    }
}
