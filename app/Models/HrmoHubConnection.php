<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrmoHubConnection extends Model
{
    protected $fillable = [
        'pillar',
        'name',
        'base_url',
        'token',
        'status',
        'last_sync_at',
        'last_sync_result',
        'config',
    ];

    protected $hidden = [
        'token',
    ];

    protected $casts = [
        'last_sync_at'     => 'datetime',
        'last_sync_result' => 'array',
        'config'           => 'array',
    ];

    // Pillar constants
    const PILLAR_RSP = 'rsp';
    const PILLAR_PMS = 'pms';
    const PILLAR_RNR = 'rnr';
    const PILLAR_LD  = 'ld';

    const STATUS_CONNECTED          = 'connected';
    const STATUS_DISCONNECTED       = 'disconnected';
    const STATUS_BUILT_IN           = 'built_in';
    const STATUS_PENDING_ACCEPTANCE = 'pending_acceptance';
    const STATUS_REJECTED           = 'rejected';

    /**
     * Seed default pillars if they don't exist.
     * Only creates missing rows — never overwrites status on existing ones.
     */
    public static function seedDefaults(): void
    {
        $pillars = [
            ['pillar' => self::PILLAR_RSP, 'name' => 'RSP — Recruitment, Selection & Placement', 'status' => self::STATUS_DISCONNECTED],
            ['pillar' => self::PILLAR_PMS, 'name' => 'PMS — Performance Management System',     'status' => self::STATUS_BUILT_IN],
            ['pillar' => self::PILLAR_RNR, 'name' => 'RNR — Rewards & Recognition',              'status' => self::STATUS_DISCONNECTED],
            ['pillar' => self::PILLAR_LD,  'name' => 'L&D — Learning & Development',             'status' => self::STATUS_DISCONNECTED],
        ];

        foreach ($pillars as $pillar) {
            static::firstOrCreate(
                ['pillar' => $pillar['pillar']],
                ['name' => $pillar['name'], 'status' => $pillar['status']]
            );
        }
    }
}
