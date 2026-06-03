<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FunctionModel extends Model
{
    protected $table = 'functions';

    protected $fillable = [
        'name',
        'code',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function uwpMfos(): HasMany
    {
        return $this->hasMany(UwpMfo::class, 'function_id');
    }
}
