<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UwpSuccessIndicator extends Model
{
    protected $table = 'uwp_success_indicators';

    protected $fillable = [
        'uwp_mfo_id',
        'indicator_text',
        'target_quantity',
        'target_timeline',
        'allotted_budget',
        'baseline',         // e.g. "85% in FY 2023" — shown in Indicator Context sidebar
        'reference_code',   // e.g. "RSP-2025-01"
        'sort_order',
    ];

    protected $casts = [
        'allotted_budget' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function uwpMfo(): BelongsTo
    {
        return $this->belongsTo(UwpMfo::class, 'uwp_mfo_id');
    }

    public function qetStandards(): HasMany
    {
        return $this->hasMany(UwpQetStandard::class, 'uwp_success_indicator_id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(UwpIndicatorAssignment::class, 'uwp_success_indicator_id');
    }
}
