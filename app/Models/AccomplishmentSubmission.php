<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AccomplishmentSubmission extends Model
{
    protected $fillable = [
        'employee_id', 'office_id', 'performance_period_id', 'ipcr_id',
        'dataset_source', 'qar_header_id', 'status',
        'employee_remarks', 'attachments', 'submitted_at',
        'supervisor_id', 'supervisor_remarks', 'supervisor_action_at',
        'dept_head_id', 'dept_head_remarks', 'dept_head_action_at',
        'pmt_id', 'pmt_remarks', 'pmt_action_at',
    ];

    protected $casts = [
        'attachments'          => 'array',
        'submitted_at'         => 'datetime',
        'supervisor_action_at' => 'datetime',
        'dept_head_action_at'  => 'datetime',
        'pmt_action_at'        => 'datetime',
    ];

    public function employee(): BelongsTo  { return $this->belongsTo(User::class, 'employee_id'); }
    public function office(): BelongsTo    { return $this->belongsTo(Office::class); }
    public function period(): BelongsTo    { return $this->belongsTo(PerformancePeriod::class, 'performance_period_id'); }
    public function ipcr(): BelongsTo      { return $this->belongsTo(Ipcr::class); }
    public function qarHeader(): BelongsTo { return $this->belongsTo(QarHeader::class); }
    public function mpors(): BelongsToMany { return $this->belongsToMany(Mpor::class, 'accomplishment_submission_mpor'); }

    public function isLocked(): bool
    {
        return !in_array($this->status, ['draft', 'returned_to_employee']);
    }
}
