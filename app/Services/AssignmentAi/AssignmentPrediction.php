<?php

namespace App\Services\AssignmentAi;

/**
 * Normalizes a partial prediction into the full, UI-ready shape.
 *
 * A source may supply only what it knows (e.g. just `load`, or just `success_prob`)
 * and the remaining fields — the inverse value, risk bucket, status, warning flag —
 * are derived here so every predictor returns a consistent payload.
 */
class AssignmentPrediction
{
    // Tunable thresholds — change these to retune the prototype (and real model) buckets.
    public const RISK_LOW_AT = 75;     // success_prob >= 75 => Low

    public const RISK_MEDIUM_AT = 50;  // success_prob >= 50 => Medium, else High

    public const STATUS_CRITICAL_AT = 90; // load >= 90 => Critical

    public const STATUS_BUSY_AT = 65;     // load >= 65 => Busy, else Available

    public const WARNING_BELOW = 50;      // success_prob below this => warning

    public static function riskFromSuccess(int $successProb): string
    {
        if ($successProb >= self::RISK_LOW_AT) {
            return 'Low';
        }
        if ($successProb >= self::RISK_MEDIUM_AT) {
            return 'Medium';
        }

        return 'High';
    }

    public static function statusFromLoad(int $load): string
    {
        if ($load >= self::STATUS_CRITICAL_AT) {
            return 'Critical';
        }
        if ($load >= self::STATUS_BUSY_AT) {
            return 'Busy';
        }

        return 'Available';
    }

    /**
     * @param  array<string,mixed>  $values  any subset of load/success_prob/risk/status/warning/source
     * @return array<string,mixed>
     */
    public static function make(array $values): array
    {
        $load = $values['load'] ?? null;
        $success = $values['success_prob'] ?? null;

        if ($success === null && $load !== null) {
            $success = 100 - (int) $load;
        }
        if ($load === null && $success !== null) {
            $load = 100 - (int) $success;
        }

        $load = self::clamp((int) round((float) ($load ?? 0)));
        $success = self::clamp((int) round((float) ($success ?? 0)), 10);

        return [
            'load' => $load,
            'success_prob' => $success,
            'risk' => $values['risk'] ?? self::riskFromSuccess($success),
            'status' => $values['status'] ?? self::statusFromLoad($load),
            'warning' => $values['warning'] ?? ($success < self::WARNING_BELOW),
            'source' => $values['source'] ?? 'simulated',
        ];
    }

    private static function clamp(int $n, int $min = 0, int $max = 100): int
    {
        return max($min, min($max, $n));
    }
}
