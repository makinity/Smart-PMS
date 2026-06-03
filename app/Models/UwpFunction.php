<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UwpFunction extends Model
{
    protected $table = 'uwp_functions';

    protected $fillable = [
        'unit_work_plan_id',
        'name',
        'function_type',
        'weight_percent',
        'sort_order',
    ];

    protected $casts = [
        'weight_percent' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function unitWorkPlan(): BelongsTo
    {
        return $this->belongsTo(UnitWorkPlan::class, 'unit_work_plan_id');
    }

    public function mfos(): HasMany
    {
        return $this->hasMany(UwpMfo::class, 'uwp_function_id');
    }
}
