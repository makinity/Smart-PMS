<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, HasRoles, Notifiable, RecordsActivity, TwoFactorAuthenticatable;

    // Activity log tracks auth-level + role changes only now.
    // Employee-level changes are logged on the Employee model.
    protected array $activitylogAttributes = [
        'name',
        'email',
        'role',
    ];

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
    }

    // ── Relationships ────────────────────────────────────────────────────────

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    public function supervisedOffice()
    {
        return $this->hasOne(Office::class, 'head_id');
    }

    public function orsSupervisedEntries(): HasMany
    {
        return $this->hasMany(OrsEntry::class, 'supervisor_id');
    }

    // ── Accessor bridge ──────────────────────────────────────────────────────
    // These delegate to the Employee record so existing code that reads
    // $user->office_id, $user->is_active, etc. keeps working without changes.
    // Controllers / services are being updated progressively to use
    // $user->employee->... directly; these will be removed when that is done.

    public function getEmployeeIdAttribute(): ?string
    {
        return $this->employee?->employee_id;
    }

    public function getHmsEmployeeIdAttribute(): ?int
    {
        return $this->employee?->hms_employee_id;
    }

    public function getOfficeIdAttribute(): ?int
    {
        return $this->employee?->office_id;
    }

    public function getPositionAttribute(): ?string
    {
        return $this->employee?->position;
    }

    public function getIsActiveAttribute(): bool
    {
        return (bool) ($this->employee?->is_active ?? false);
    }

    public function getIsDisabledAttribute(): bool
    {
        return (bool) ($this->employee?->is_disabled ?? false);
    }

    public function getActivatedAtAttribute(): ?\Illuminate\Support\Carbon
    {
        $val = $this->employee?->activated_at;
        if ($val === null) return null;
        return $val instanceof \Illuminate\Support\Carbon ? $val : \Illuminate\Support\Carbon::parse($val);
    }

    public function getProfilePhotoPathAttribute(): ?string
    {
        return $this->employee?->profile_photo_path;
    }

    public function getTrainingLockedAttribute(): bool
    {
        return (bool) ($this->employee?->training_locked ?? false);
    }

    public function getLndReferenceIdAttribute(): ?string
    {
        return $this->employee?->lnd_reference_id;
    }

    /** Delegates to Employee's office relationship. */
    public function getOfficeAttribute(): ?Office
    {
        return $this->employee?->office;
    }

    public function getProfilePhotoUrlAttribute(): string
    {
        return $this->employee?->profile_photo_url
            ?? \Illuminate\Support\Facades\Storage::url('profiles/default.jpeg');
    }

    public function getInitialsAttribute(): string
    {
        $words    = explode(' ', $this->name);
        $initials = '';
        foreach ($words as $w) {
            $initials .= mb_substr($w, 0, 1);
        }

        return mb_strtoupper(mb_substr($initials, 0, 2));
    }

    // ── Role helpers ─────────────────────────────────────────────────────────

    public function isSupervisor(): bool
    {
        return $this->role === 'supervisor';
    }

    public function isDepartmentHead(): bool
    {
        return $this->role === 'dept-head';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
