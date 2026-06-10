<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Office extends Model
{
    use RecordsActivity;

    protected $fillable = ['name', 'code', 'head_id', 'is_active', 'hris_id', 'hris_synced_at'];

    protected $casts = [
        'is_active' => 'boolean',
        'hris_synced_at' => 'datetime',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function unitWorkPlans(): HasMany
    {
        return $this->hasMany(UnitWorkPlan::class);
    }

    public function opcrs(): HasMany
    {
        return $this->hasMany(Opcr::class);
    }

    public function opcrAccomplishments(): HasMany
    {
        return $this->hasMany(OpcraAccomplishmentSubmission::class);
    }

    public function head(): BelongsTo
    {
        return $this->belongsTo(User::class, 'head_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
