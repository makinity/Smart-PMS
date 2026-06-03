<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrsEntryMonitoring extends Model
{
    protected $fillable = [
        'ors_entry_id',
        'supervisor_id',
        'quality_rating',
        'timeliness_rating',
        'remarks',
        'rated_at',
    ];

    protected $casts = [
        'rated_at' => 'datetime',
        'quality_rating' => 'integer',
        'timeliness_rating' => 'integer',
    ];

    public function orsEntry(): BelongsTo
    {
        return $this->belongsTo(OrsEntry::class);
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }
}

