<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IpcrItem extends Model
{
    protected $fillable = ['ipcr_id', 'uwp_success_indicator_id'];

    public function ipcr()      { return $this->belongsTo(Ipcr::class); }
    public function indicator() { return $this->belongsTo(UwpSuccessIndicator::class, 'uwp_success_indicator_id'); }
}
