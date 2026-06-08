<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IpcrItem extends Model
{
    protected $fillable = [
        'ipcr_id', 'uwp_success_indicator_id',
        'uwp_function_id', 'output_title', 'indicator_text',
        'function_type', 'target_quantity', 'target_timeline',
        'target_summary', 'standards_payload',
    ];

    protected $casts = ['standards_payload' => 'array'];

    public function ipcr()      { return $this->belongsTo(Ipcr::class); }
    public function indicator() { return $this->belongsTo(UwpSuccessIndicator::class, 'uwp_success_indicator_id'); }
}
