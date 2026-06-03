<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UwpConsolidationSignature extends Model
{
    protected $fillable = [
        'unit_work_plan_id',
        'opcr_id',
        'signed_by',
        'signature_image_path',
        'signed_excel_path',
        'signature_hash',
        'signed_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function unitWorkPlan(): BelongsTo
    {
        return $this->belongsTo(UnitWorkPlan::class, 'unit_work_plan_id');
    }

    public function opcr(): BelongsTo
    {
        return $this->belongsTo(Opcr::class, 'opcr_id');
    }

    public function signer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_by');
    }
}
