<?php

namespace App\Models;

use App\Models\Office;
use App\Models\PerformancePeriod;
use App\Models\UnitWorkPlan;
use Illuminate\Database\Eloquent\Model;

class Opcr extends Model
{
    protected $fillable = ['office_id', 'performance_period_id', 'status'];

    public function office() { return $this->belongsTo(Office::class); }
    public function period() { return $this->belongsTo(PerformancePeriod::class, 'performance_period_id'); }
    public function uwps()   { return $this->belongsToMany(UnitWorkPlan::class, 'opcr_unit_work_plan', 'opcr_id', 'unit_work_plan_id')->withTimestamps(); }
}
