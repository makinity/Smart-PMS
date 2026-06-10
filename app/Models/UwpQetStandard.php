<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UwpQetStandard extends Model
{
    protected $table = 'uwp_qet_standards';

    public const DIM_QUALITY = 'quality';      // Q — accuracy, completeness, adherence

    public const DIM_EFFICIENCY = 'efficiency';   // E — resource utilization, process optimization

    public const DIM_TIMELINESS = 'timeliness';   // T — meeting deadlines, turnaround time

    // Rating scale (matches form columns: 5=Outstanding → 1=Poor)
    public const RATING_OUTSTANDING = 5;

    public const RATING_VERY_SATISFACTORY = 4;

    public const RATING_SATISFACTORY = 3;

    public const RATING_UNSATISFACTORY = 2;

    public const RATING_POOR = 1;

    protected $fillable = [
        'uwp_success_indicator_id',
        'dimension',
        'rating',
        'standard_text',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function successIndicator(): BelongsTo
    {
        return $this->belongsTo(UwpSuccessIndicator::class, 'uwp_success_indicator_id');
    }
}
