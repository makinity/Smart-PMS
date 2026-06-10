<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrsEntryMonitoring extends Model
{
    protected $table = 'ors_entry_monitorings';

    protected $fillable = ['ors_entry_id', 'supervisor_id', 'quality_rating', 'timeliness_rating', 'remarks', 'rated_at'];

    protected $casts = ['rated_at' => 'datetime'];

    public function entry()
    {
        return $this->belongsTo(OrsEntry::class, 'ors_entry_id');
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }
}
