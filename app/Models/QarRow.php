<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QarRow extends Model
{
    protected $fillable = [
        'qar_header_id', 'ppa_code', 'mfo_title', 'indicator_text',
        'target_quantity', 'target_timeline', 'actual_performance',
        'variance', 'remarks', 'sort_order',
    ];

    public function header(): BelongsTo { return $this->belongsTo(QarHeader::class, 'qar_header_id'); }
}
