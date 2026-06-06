<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrsEntryEvidence extends Model
{
    protected $table = 'ors_entry_evidences';
    protected $fillable = ['ors_entry_id', 'file_name', 'file_path', 'mime_type', 'file_size', 'uploaded_at'];
    protected $casts = ['uploaded_at' => 'datetime'];

    public function entry() { return $this->belongsTo(OrsEntry::class, 'ors_entry_id'); }
}
