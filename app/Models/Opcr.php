<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;

class Opcr extends Model
{
    use RecordsActivity;

    protected $fillable = ['office_id', 'performance_period_id', 'status', 'return_remarks', 'returned_by'];

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function period()
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function uwps()
    {
        return $this->belongsToMany(UnitWorkPlan::class, 'opcr_unit_work_plan', 'opcr_id', 'unit_work_plan_id')->withTimestamps();
    }
}
