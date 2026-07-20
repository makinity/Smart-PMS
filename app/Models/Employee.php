<?php

namespace App\Models;

use App\Models\Concerns\RecordsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Employee extends Model
{
    use HasFactory, RecordsActivity;

    protected array $activitylogAttributes = [
        'employee_id',
        'first_name',
        'last_name',
        'middle_name',
        'office_id',
        'position',
        'is_active',
        'is_disabled',
        'activated_at',
        'training_locked',
        'lnd_reference_id',
    ];

    protected $fillable = [
        'user_id',
        'employee_id',
        'hms_employee_id',
        'first_name',
        'middle_name',
        'last_name',
        'office_id',
        'position',
        'is_active',
        'is_disabled',
        'activated_at',
        'profile_photo_path',
        'training_locked',
        'lnd_reference_id',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'is_disabled'     => 'boolean',
        'training_locked' => 'boolean',
        'activated_at'    => 'datetime',
        'hms_employee_id' => 'integer',
    ];

    // ── Relationships ────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    /**
     * Returns formatted full name: "Firstname M. Lastname"
     * Falls back to user->name if name parts are not yet populated.
     */
    public function getFullNameAttribute(): string
    {
        if ($this->first_name || $this->last_name) {
            $parts = array_filter([
                $this->first_name,
                $this->middle_name ? mb_strtoupper(mb_substr($this->middle_name, 0, 1)) . '.' : null,
                $this->last_name,
            ]);
            return implode(' ', $parts);
        }

        return $this->user?->name ?? '';
    }

    /**
     * Returns formal name: "Lastname, Firstname M." — useful for exports.
     */
    public function getFormalNameAttribute(): string
    {
        if ($this->first_name || $this->last_name) {
            $first = trim(implode(' ', array_filter([
                $this->first_name,
                $this->middle_name ? mb_strtoupper(mb_substr($this->middle_name, 0, 1)) . '.' : null,
            ])));
            return trim(implode(', ', array_filter([$this->last_name, $first])));
        }

        return $this->user?->name ?? '';
    }

    public function getProfilePhotoUrlAttribute(): string
    {
        return $this->profile_photo_path
            ? Storage::url($this->profile_photo_path)
            : Storage::url('profiles/default.jpeg');
    }
}
