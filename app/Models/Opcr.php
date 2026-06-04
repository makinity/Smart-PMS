<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Opcr extends Model
{
    protected $fillable = ['office_id', 'performance_period_id', 'status'];

    public function office() { return $this->belongsTo(Office::class); }
    public function period() { return $this->belongsTo(PerformancePeriod::class, 'performance_period_id'); }
}
