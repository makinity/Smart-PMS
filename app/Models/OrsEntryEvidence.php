<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrsEntryEvidence extends Model
{
    protected $table = 'ors_entry_evidences';

    protected $fillable = [
        'ors_entry_id',
        'file_name',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_at',
    ];

    protected $casts = [
        'uploaded_at' => 'datetime',
    ];

    public function orsEntry(): BelongsTo
    {
        return $this->belongsTo(OrsEntry::class, 'ors_entry_id');
    }
}

