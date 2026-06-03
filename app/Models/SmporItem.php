<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmporItem extends Model
{
    protected $table = 'smpor_items';

    protected $fillable = [
        'smpor_id',
        'employee_id',
        'overall_score',
        'quality_avg',
        'timeliness_avg',
        'adjectival_rating',
    ];

    public function smpor(): BelongsTo
    {
        return $this->belongsTo(Smpor::class, 'smpor_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }
}
