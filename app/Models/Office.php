<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Office extends Model
{
    protected $fillable = ['name', 'code', 'head_id'];

    // Add these relationships
    public function unitWorkPlans(): HasMany
    {
        return $this->hasMany(UnitWorkPlan::class);
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
