<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OpcraAccomplishmentSubmission extends Model
{
    protected $table = 'opcr_accomplishment_submissions';
    protected $fillable = [
        'office_id', 'performance_period_id', 'dept_head_id', 'status',
        'computed_office_rating', 'final_office_rating', 'final_adjectival_rating',
        'dept_head_remarks', 'flagged_for_calibration',
        'pmt_member_id', 'pmt_remarks', 'submitted_at', 'pmt_action_at',
    ];

    protected $casts = [
        'flagged_for_calibration' => 'boolean',
        'submitted_at'            => 'datetime',
        'pmt_action_at'           => 'datetime',
        'computed_office_rating'  => 'decimal:2',
        'final_office_rating'     => 'decimal:2',
    ];

    public function office()  { return $this->belongsTo(Office::class); }
    public function period()  { return $this->belongsTo(PerformancePeriod::class, 'performance_period_id'); }
    public function deptHead(){ return $this->belongsTo(User::class, 'dept_head_id'); }
    public function pmtMember(){ return $this->belongsTo(User::class, 'pmt_member_id'); }
}
