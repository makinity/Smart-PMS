<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccomplishmentSubmission extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_SUBMITTED_TO_SUPERVISOR = 'submitted_to_supervisor';
    public const STATUS_SUPERVISOR_ENDORSED = 'supervisor_endorsed';
    public const STATUS_DEPT_HEAD_ENDORSED = 'dept_head_endorsed';
    public const STATUS_RECOMMENDED_BY_PMT = 'recommended_by_pmt';
    public const STATUS_RELEASED_BY_PMT = 'released_by_pmt';
    public const STATUS_RETURNED_TO_EMPLOYEE = 'returned_to_employee';

    protected $fillable = [
        'employee_id',
        'office_id',
        'performance_period_id',
        'ipcr_id',
        'dataset_source',
        'qar_header_id',
        'status',
        'employee_remarks',
        'attachments',
        'submitted_at',
        'supervisor_id',
        'supervisor_remarks',
        'supervisor_action_at',
        'dept_head_id',
        'dept_head_remarks',
        'dept_head_action_at',
        'pmt_id',
        'pmt_remarks',
        'pmt_action_at',
    ];

    protected $casts = [
        'attachments' => 'array',
        'submitted_at' => 'datetime',
        'supervisor_action_at' => 'datetime',
        'dept_head_action_at' => 'datetime',
        'pmt_action_at' => 'datetime',
    ];

    public function employee()
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function performancePeriod()
    {
        return $this->belongsTo(PerformancePeriod::class);
    }

    public function ipcr()
    {
        return $this->belongsTo(Ipcr::class);
    }

    public function qarHeader()
    {
        return $this->belongsTo(QarHeader::class);
    }

    public function mpors()
    {
        return $this->belongsToMany(
            Mpor::class,
            'accomplishment_submission_mpor',
            'accomplishment_submission_id',
            'mpor_id'
        )->withTimestamps();
    }
}
