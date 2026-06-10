<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PerformancePeriod extends Model
{
    use RecordsActivity;

    protected $fillable = ['name', 'start_date', 'end_date', 'is_active'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    /**
     * Returns the active period: explicit is_active=true first,
     * otherwise the one whose date range covers today.
     */
    public static function current(): ?self
    {
        return static::where('is_active', true)->first()
            ?? static::whereDate('start_date', '<=', today())
                ->whereDate('end_date', '>=', today())
                ->latest('start_date')
                ->first();
    }

    public function unitWorkPlans(): HasMany
    {
        return $this->hasMany(UnitWorkPlan::class);
    }
}
