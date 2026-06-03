<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpcrItem extends Model
{
    protected $table = 'ipcr_items';

    protected $fillable = [
        'ipcr_id',
        'uwp_function_id',
        'uwp_success_indicator_id',
        'output_title',
        'function_type',
        'indicator_text',
        'target_quantity',
        'target_timeline',
        'target_summary',
        'standards_payload',
    ];

    protected $casts = [
        'target_quantity' => 'integer',
        'standards_payload' => 'array',
    ];

    public function ipcr(): BelongsTo
    {
        return $this->belongsTo(Ipcr::class, 'ipcr_id');
    }

    public function uwpFunction(): BelongsTo
    {
        return $this->belongsTo(UwpFunction::class, 'uwp_function_id');
    }

    public function uwpSuccessIndicator(): BelongsTo
    {
        return $this->belongsTo(UwpSuccessIndicator::class, 'uwp_success_indicator_id');
    }
}
