<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevelopmentPlan extends Model
{
    use RecordsActivity;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PENDING_DETAILS = 'pending_details';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_SUPERVISOR_RECOMMENDED = 'supervisor_recommended';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_DEPT_HEAD_APPROVED = 'dept_head_approved';
    public const STATUS_SUBMITTED_TO_PMT = 'submitted_to_pmt';
    public const STATUS_SUBMITTED_TO_LD = 'submitted_to_ld';
    public const STATUS_COMPLETED = 'completed';

    public const STATUS_APPROVED = 'approved';

    public const LND_SYNC_NOT_SENT = 'not_sent';
    public const LND_SYNC_SENT = 'sent';
    public const LND_SYNC_ACKNOWLEDGED = 'acknowledged';
    public const LND_SYNC_FAILED = 'failed';

    protected $fillable = [
        'ipcr_id', 'employee_id', 'supervisor_id', 'dept_head_id', 'office_id', 'performance_period_id',
        'source_score', 'source_rating',
        'status', 'pmt_remarks', 'supervisor_remarks', 'supervisor_action_at',
        'dept_head_remarks', 'dept_head_action_at', 'idp_rows',
        'prepared_by_name', 'recommended_by_name', 'approved_by_name',
        'lnd_sync_status', 'lnd_reference_id', 'lnd_synced_at', 'lnd_last_error',
        'submitted_to_ld_at',
        'lnd_completed_at', 'lnd_completion_remarks', 'lnd_courses_completed',
        'created_by', 'updated_by',
    ];

    protected $casts = [
        'idp_rows'              => 'array',
        'lnd_courses_completed' => 'array',
        'source_score'          => 'decimal:2',
        'lnd_synced_at'         => 'datetime',
        'submitted_to_ld_at'    => 'datetime',
        'lnd_completed_at'      => 'datetime',
        'supervisor_action_at'  => 'datetime',
        'dept_head_action_at'   => 'datetime',
    ];

    public function deptHead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dept_head_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    public function ipcr(): BelongsTo
    {
        return $this->belongsTo(Ipcr::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function performancePeriod(): BelongsTo
    {
        return $this->belongsTo(PerformancePeriod::class, 'performance_period_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
