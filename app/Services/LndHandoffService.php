<?php

namespace App\Services;

use App\Models\DevelopmentPlan;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class LndHandoffService
{
    public function sendDevelopmentPlan(DevelopmentPlan $developmentPlan): array
    {
        $baseUrl = trim((string) config('services.lnd.base_url', ''));
        $token = trim((string) config('services.lnd.token', ''));
        $timeout = (int) config('services.lnd.timeout', 20);

        if ($baseUrl === '') {
            throw new RuntimeException('LND API base URL is not configured.');
        }

        if ($token === '') {
            throw new RuntimeException('LND API token is not configured.');
        }

        $endpoint = rtrim($baseUrl, '/') . '/api/lnd/development-plans';

        $payload = $this->buildPayload($developmentPlan);

        $response = Http::timeout(max(5, $timeout))
            ->acceptJson()
            ->asJson()
            ->withToken($token)
            ->post($endpoint, $payload);

        $body = $response->json();
        if (!is_array($body)) {
            $body = [];
        }

        if (!$response->ok()) {
            $message = (string) ($body['message'] ?? ('LND API returned HTTP ' . $response->status()));
            throw new RuntimeException($message);
        }

        return [
            'ok' => (bool) ($body['ok'] ?? true),
            'status' => (string) ($body['status'] ?? 'sent'),
            'lnd_reference_id' => isset($body['lnd_reference_id']) ? (string) $body['lnd_reference_id'] : null,
            'message' => isset($body['message']) ? (string) $body['message'] : null,
            'payload' => $payload,
        ];
    }

    public function buildPayload(DevelopmentPlan $developmentPlan): array
    {
        $developmentPlan->loadMissing(['performancePeriod', 'employee.office']);

        return [
            'external_plan_id' => 'PMS-DP-' . $developmentPlan->id,
            'source_system' => 'PMS',
            'period' => [
                'id' => (int) ($developmentPlan->performance_period_id ?? 0),
                'name' => (string) ($developmentPlan->performancePeriod?->name ?? '--'),
            ],
            'employee' => [
                'id' => (int) ($developmentPlan->employee_id ?? 0),
                'name' => (string) ($developmentPlan->employee?->name ?? '--'),
                'office_id' => (int) ($developmentPlan->office_id ?? 0),
                'office_name' => (string) ($developmentPlan->employee?->office?->name ?? '--'),
                'position' => (string) ($developmentPlan->employee?->position ?? '--'),
            ],
            'performance' => [
                'official_score' => is_numeric($developmentPlan->source_score) ? round((float) $developmentPlan->source_score, 2) : 0.0,
                'official_rating' => (string) ($developmentPlan->source_rating ?? '--'),
                'released_at' => optional($developmentPlan->ipcr?->released_at)->toISOString(),
            ],
            'references' => [
                'ipcr_id' => (int) ($developmentPlan->ipcr_id ?? 0),
                'opcr_id' => null,
            ],
        ];
    }
}

