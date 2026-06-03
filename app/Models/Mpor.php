<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Mpor extends Model
{
    protected $fillable = [
        'employee_id',
        'office_id',
        'month',
        'status',
        'generated_at',
        'submitted_at',
        'approved_by',
        'approved_at',
        'endorsed_by',
        'endorsed_at',
        'returned_by',
        'returned_at',
        'return_remarks',
        'created_by',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'endorsed_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employee_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function orsEntries(): HasMany
    {
        return $this->hasMany(OrsEntry::class, 'mpor_id');
    }

    public function ratedOrsEntries(): HasMany
    {
        return $this->hasMany(OrsEntry::class, 'mpor_id')->where('status', 'rated');
    }

    /**
     * Stage II: MPOR mirror is derived from rated ORS entries in the MPOR month
     * (not dependent on ors_entries.mpor_id being set).
     */
    // public function ratedOrsEntriesForMonth(): HasMany
    // {
    //     $start = Carbon::createFromFormat('Y-m', (string) $this->month)->startOfMonth()->toDateString();
    //     $end = Carbon::createFromFormat('Y-m', (string) $this->month)->endOfMonth()->toDateString();

    //     return $this->hasMany(OrsEntry::class, 'employee_id', 'employee_id')
    //         ->where('status', 'rated')
    //         ->where('quantity', '>', 0)
    //         ->whereBetween('work_date', [$start, $end])
    //         ->whereHas('monitoring', function ($q) {
    //             $q->whereNotNull('quality_rating')
    //               ->whereNotNull('timeliness_rating');
    //         });
    // }

    public function ratedOrsEntriesForMonth(): HasMany
    {
        $raw = trim((string) $this->month);
        $monthKey = substr($raw, 0, 7); // supports YYYY-MM or YYYY-MM-DD

        try {
            $base = Carbon::createFromFormat('Y-m', $monthKey);
        } catch (\Throwable $e) {
            // fallback for weird formats (e.g., "January 2026")
            $base = Carbon::parse($raw)->startOfMonth();
        }

        $start = $base->copy()->startOfMonth()->toDateString();
        $end   = $base->copy()->endOfMonth()->toDateString();

        return $this->hasMany(OrsEntry::class, 'employee_id', 'employee_id')
            ->where('status', 'rated')
            ->where('quantity', '>', 0)
            ->whereBetween('work_date', [$start, $end])
            ->whereHas('monitoring', function ($q) {
                $q->whereNotNull('quality_rating')
                ->whereNotNull('timeliness_rating');
            });
    }

    public function setMonthAttribute($value): void
    {
        $raw = trim((string) $value);
        $monthKey = substr($raw, 0, 7);

        try {
            $this->attributes['month'] = Carbon::createFromFormat('Y-m', $monthKey)->format('Y-m');
        } catch (\Throwable $e) {
            $this->attributes['month'] = Carbon::parse($raw)->format('Y-m');
        }
    }
}
