<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QarRow extends Model
{
    protected $table = 'qar_rows';

    protected $fillable = [
        'qar_header_id',
        'ppa_code',
        'mfo_title',
        'indicator_text',
        'target_quantity',
        'target_timeline',
        'actual_performance',
        'variance',
        'remarks',
        'sort_order',
    ];

    protected $casts = [
        'target_quantity' => 'decimal:2',
        'actual_performance' => 'decimal:2',
        'variance' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function qarHeader(): BelongsTo
    {
        return $this->belongsTo(QarHeader::class);
    }
}
