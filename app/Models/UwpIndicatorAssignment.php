<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UwpIndicatorAssignment extends Model
{
    protected $table = 'uwp_indicator_assignments';

    protected $fillable = [
        'uwp_success_indicator_id',
        'employee_id',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
    ];

    public function successIndicator(): BelongsTo
    {
        return $this->belongsTo(UwpSuccessIndicator::class, 'uwp_success_indicator_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
