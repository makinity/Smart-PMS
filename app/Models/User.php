<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, HasRoles, Notifiable, RecordsActivity, TwoFactorAuthenticatable;

    protected array $activitylogAttributes = [
        'employee_id',
        'name',
        'email',
        'role',
        'office_id',
        'position',
        'is_active',
        'is_disabled',
        'activated_at',
    ];

    protected $fillable = [
        'employee_id',
        'hms_employee_id',
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'activated_at',
        'profile_photo_path',
        'office_id',
        'position',
        'training_locked',
        'lnd_reference_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'profile_photo_url',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'bool',
            'activated_at' => 'datetime',
            'hms_employee_id' => 'integer',
        ];
    }

    // Add these relationships
    public function office()
    {
        return $this->belongsTo(Office::class);
    }

    public function supervisedOffice()
    {
        return $this->hasOne(Office::class, 'head_id');
    }

    public function orsSupervisedEntries(): HasMany
    {
        return $this->hasMany(OrsEntry::class, 'supervisor_id');
    }

    public function getProfilePhotoUrlAttribute()
    {
        return $this->profile_photo_path
            ? Storage::url($this->profile_photo_path)
            : Storage::url('profiles/default.jpeg');
    }

    public function getInitialsAttribute()
    {
        $words = explode(' ', $this->name);
        $initials = '';
        foreach ($words as $w) {
            $initials .= mb_substr($w, 0, 1);
        }

        return mb_strtoupper(mb_substr($initials, 0, 2));
    }

    public function isSupervisor()
    {
        return $this->role === 'supervisor';
    }

    public function isDepartmentHead()
    {
        return $this->role === 'dept-head';
    }

    public function isAdmin()
    {
        return $this->role === 'admin';
    }
}
