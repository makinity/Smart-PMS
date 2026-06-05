<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ipcr extends Model
{
    protected $fillable = ['employee_id', 'opcr_id', 'performance_period_id', 'status', 'committed_at'];

    protected $casts = ['committed_at' => 'datetime'];

    public function employee()      { return $this->belongsTo(User::class, 'employee_id'); }
    public function opcr()          { return $this->belongsTo(Opcr::class); }
    public function period()        { return $this->belongsTo(PerformancePeriod::class, 'performance_period_id'); }
    public function items()         { return $this->hasMany(IpcrItem::class); }
    public function indicators()    { return $this->belongsToMany(UwpSuccessIndicator::class, 'ipcr_items', 'ipcr_id', 'uwp_success_indicator_id')->withTimestamps(); }
}
