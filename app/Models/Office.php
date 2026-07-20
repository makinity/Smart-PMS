<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Office extends Model
{
    use RecordsActivity;

    protected $fillable = ['name', 'code', 'head_id', 'is_active', 'hris_id', 'hris_synced_at'];

    protected $casts = [
        'is_active'      => 'boolean',
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

    /**
     * All Employee records assigned to this office.
     * (Previously pointed to User, but now employee HR data lives in employees table.)
     */
    public function employeeRecords(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * All Users (auth) whose employee record belongs to this office.
     * Use this for withCount() and whereHas() on the User model via office.
     */
    public function employees(): HasManyThrough
    {
        return $this->hasManyThrough(
            User::class,   // final model
            Employee::class, // through model
            'office_id',   // FK on employees
            'id',          // FK on users
            'id',          // local key on offices
            'user_id'      // local key on employees
        );
    }
}
