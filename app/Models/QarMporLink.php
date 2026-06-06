<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QarMporLink extends Model
{
    protected $fillable = [
        'qar_header_id', 'mpor_id', 'employee_name', 'month_label', 'status_label',
    ];

    public function header(): BelongsTo { return $this->belongsTo(QarHeader::class, 'qar_header_id'); }
    public function mpor(): BelongsTo   { return $this->belongsTo(Mpor::class); }
}
