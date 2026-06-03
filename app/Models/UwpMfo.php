<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UwpMfo extends Model
{
    protected $table = 'uwp_mfos';

    protected $fillable = [
        'uwp_function_id',
        'title',
        'target_quantity',
        'target_timeline',
        'weight_percent',
        'sort_order',
    ];

    protected $casts = [
        'weight_percent' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function uwpFunction(): BelongsTo
    {
        return $this->belongsTo(UwpFunction::class, 'uwp_function_id');
    }

    public function successIndicators(): HasMany
    {
        return $this->hasMany(UwpSuccessIndicator::class, 'uwp_mfo_id');
    }
}
