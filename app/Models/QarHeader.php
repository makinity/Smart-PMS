<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QarHeader extends Model
{
    protected $fillable = [
        'office_id', 'performance_period_id', 'quarter_key', 'status',
        'generated_at', 'generated_by', 'approved_at', 'approved_by',
        'pmt_status', 'pmt_validated_at', 'pmt_validated_by', 'return_remarks',
    ];

    protected $casts = [
        'generated_at'    => 'datetime',
        'approved_at'     => 'datetime',
        'pmt_validated_at'=> 'datetime',
    ];

    public function office(): BelongsTo           { return $this->belongsTo(Office::class); }
    public function performancePeriod(): BelongsTo { return $this->belongsTo(PerformancePeriod::class); }
    public function generatedBy(): BelongsTo       { return $this->belongsTo(User::class, 'generated_by'); }
    public function approvedBy(): BelongsTo        { return $this->belongsTo(User::class, 'approved_by'); }
    public function pmtValidatedBy(): BelongsTo    { return $this->belongsTo(User::class, 'pmt_validated_by'); }
    public function rows(): HasMany                { return $this->hasMany(QarRow::class, 'qar_header_id'); }
    public function mporLinks(): HasMany           { return $this->hasMany(QarMporLink::class, 'qar_header_id'); }
}
