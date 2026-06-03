<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UwpQetStandard extends Model
{
    protected $table = 'uwp_qet_standards';

    public const DIM_QUALITY = 'q';
    public const DIM_EFFICIENCY = 'e';
    public const DIM_TIMELINESS = 't';

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
