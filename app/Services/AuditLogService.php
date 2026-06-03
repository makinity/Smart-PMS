<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuditLogService
{
    private const REDACTED_VALUE = '[REDACTED]';

    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'token',
        'remember_token',
        'bearer_token',
        'signature',
        'current_password',
        'new_password',
        'new_password_confirmation',
    ];

    public function logRequest(Request $request, SymfonyResponse $response): void
    {
        try {
            $route = $request->route();
            $routeName = $route?->getName();
            $moduleKey = $this->inferModuleKey($routeName, $request->path());
            $actionKey = $this->inferActionKey($routeName, $request);
            [$targetType, $targetId, $routeParameters] = $this->extractTarget($route?->parameters() ?? []);
            $status = $this->resolveStatus($request, $response);
            $message = $this->extractResponseMessage($request, $response);
            $actor = $this->resolveActorSnapshot($request);

            $this->log([
                'actor_user_id' => $actor['id'],
                'actor_name' => $actor['name'],
                'actor_role' => $actor['role'],
                'action_key' => $actionKey,
                'module_key' => $moduleKey,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'route_name' => $routeName,
                'http_method' => Str::upper($request->method()),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'status' => $status,
                'summary' => $this->buildSummary($status, $actionKey, $moduleKey, $targetType, $targetId),
                'metadata' => array_filter([
                    'request' => $this->sanitizeArray($request->except(['_token'])),
                    'files' => $this->summarizeFiles($request->allFiles()),
                    'query' => $this->sanitizeArray($request->query()),
                    'route_parameters' => $routeParameters,
                    'response_status' => $response->getStatusCode(),
                    'message' => $message,
                ], static fn ($value) => !($value === [] || $value === null || $value === '')),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log write skipped.', [
                'error' => $e->getMessage(),
                'path' => $request->path(),
                'route' => $request->route()?->getName(),
            ]);
        }
    }

    public function log(array $attributes): ?AuditLog
    {
        try {
            return AuditLog::query()->create($attributes);
        } catch (\Throwable $e) {
            Log::warning('Audit log persistence failed.', [
                'error' => $e->getMessage(),
                'route_name' => $attributes['route_name'] ?? null,
                'action_key' => $attributes['action_key'] ?? null,
            ]);

            return null;
        }
    }

    private function resolveActorSnapshot(Request $request): array
    {
        $snapshot = $request->attributes->get('audit_actor_snapshot');
        if (is_array($snapshot)) {
            return [
                'id' => $snapshot['id'] ?? null,
                'name' => $snapshot['name'] ?? null,
                'role' => $snapshot['role'] ?? null,
            ];
        }

        $user = $request->user();

        return [
            'id' => $user?->id,
            'name' => $user?->name,
            'role' => $user?->role,
        ];
    }

    private function resolveStatus(Request $request, SymfonyResponse $response): string
    {
        if ($response->getStatusCode() >= 400) {
            return 'failed';
        }

        if ($request->session()->has('error')) {
            return 'failed';
        }

        $errors = $request->session()->get('errors');
        if ($errors && method_exists($errors, 'any') && $errors->any()) {
            return 'failed';
        }

        return 'success';
    }

    private function extractResponseMessage(Request $request, SymfonyResponse $response): ?string
    {
        $sessionMessage = $request->session()->get('error')
            ?? $request->session()->get('success')
            ?? $request->session()->get('info')
            ?? $request->session()->get('warning');

        if (is_string($sessionMessage) && trim($sessionMessage) !== '') {
            return trim($sessionMessage);
        }

        $errors = $request->session()->get('errors');
        if ($errors && method_exists($errors, 'first')) {
            $first = (string) $errors->first();
            if ($first !== '') {
                return $first;
            }
        }

        $content = method_exists($response, 'getContent') ? $response->getContent() : null;
        if (!is_string($content) || trim($content) === '') {
            return null;
        }

        $decoded = json_decode($content, true);
        if (!is_array($decoded)) {
            return null;
        }

        $message = $decoded['message'] ?? $decoded['status'] ?? null;

        return is_string($message) && trim($message) !== '' ? trim($message) : null;
    }

    private function extractTarget(array $parameters): array
    {
        $targetType = null;
        $targetId = null;
        $routeParameters = [];

        foreach ($parameters as $key => $value) {
            if ($key === 'fallbackPlaceholder') {
                continue;
            }

            if ($value instanceof Model) {
                $routeParameters[$key] = (string) $value->getKey();
                if ($targetId === null) {
                    $targetType = Str::snake(class_basename($value));
                    $targetId = (string) $value->getKey();
                }

                continue;
            }

            if (is_scalar($value) || $value === null) {
                $routeParameters[$key] = $value;
                if ($targetId === null && $value !== null && $value !== '') {
                    $targetType = Str::snake((string) $key);
                    $targetId = (string) $value;
                }
            }
        }

        return [$targetType, $targetId, $routeParameters];
    }

    private function inferModuleKey(?string $routeName, string $path): string
    {
        $routeName = (string) $routeName;

        return match (true) {
            $routeName === 'login.store',
            $routeName === 'logout',
            $routeName === 'password.email',
            str_starts_with($routeName, 'activate.') => 'auth',
            str_starts_with($routeName, 'admin.users') => 'admin.users',
            str_starts_with($routeName, 'admin.office') => 'admin.offices',
            str_starts_with($routeName, 'admin.database') => 'admin.database',
            $routeName === 'admin.performance-period',
            str_starts_with($routeName, 'admin.performance-periods') => 'admin.performance_periods',
            str_starts_with($routeName, 'admin.hris') => 'admin.hris',
            str_contains($routeName, 'stage2.ors') || $routeName === 'employee.ors' || str_starts_with($routeName, 'employee.ors.') => 'employee.ors',
            str_starts_with($routeName, 'employee.mpor') => 'employee.mpor',
            str_starts_with($routeName, 'supervisor.uwp') => 'supervisor.uwp',
            str_starts_with($routeName, 'supervisor.mpor') => 'supervisor.mpor',
            str_starts_with($routeName, 'dept-head.qar') => 'dept_head.qar',
            str_starts_with($routeName, 'dept-head.opcr') => 'dept_head.opcr',
            str_starts_with($routeName, 'pmt.qar') => 'pmt.qar',
            str_starts_with($routeName, 'pmt.opcr') => 'pmt.opcr',
            $routeName !== '' => Str::replace('-', '_', Str::beforeLast($routeName, '.')),
            default => Str::replace('/', '.', Str::replace('-', '_', trim($path, '/'))),
        };
    }

    private function inferActionKey(?string $routeName, Request $request): string
    {
        $routeName = (string) $routeName;

        return match (true) {
            $routeName === 'login.store' => 'login',
            $routeName === 'logout' => 'logout',
            $routeName === 'password.email' => 'request_password_reset',
            $routeName === 'activate.verify' => 'verify_activation',
            $routeName === 'activate.complete' => 'activate_account',
            $routeName === 'admin.users.reset-password' => 'reset_password',
            $routeName === 'admin.users.send-code' => 'send_employee_code',
            str_ends_with($routeName, '.toggle') || str_ends_with($routeName, '.toggle-active') => 'toggle_active',
            str_ends_with($routeName, '.activate') => 'activate',
            str_ends_with($routeName, '.deactivate') => 'deactivate',
            str_ends_with($routeName, '.store') => 'create',
            str_ends_with($routeName, '.update') => 'update',
            str_ends_with($routeName, '.destroy'),
            str_ends_with($routeName, '.delete') => 'delete',
            $routeName !== '' && str_contains($routeName, '.') => Str::replace('-', '_', Str::afterLast($routeName, '.')),
            default => Str::lower($request->method()),
        };
    }

    private function buildSummary(string $status, string $actionKey, string $moduleKey, ?string $targetType, ?string $targetId): string
    {
        $statusLabel = $status === 'success' ? 'Successful' : 'Failed';
        $actionLabel = Str::title(str_replace('_', ' ', $actionKey));
        $moduleLabel = Str::title(str_replace(['.', '_'], ' ', $moduleKey));

        $summary = "{$statusLabel} {$actionLabel} in {$moduleLabel}";

        if ($targetType && $targetId) {
            $summary .= " ({$targetType}: {$targetId})";
        }

        return Str::limit($summary, 255, '');
    }

    private function sanitizeArray(array $data): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            $keyString = Str::lower((string) $key);

            if ($this->isSensitiveKey($keyString)) {
                $sanitized[$key] = self::REDACTED_VALUE;
                continue;
            }

            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeArray($value);
                continue;
            }

            if ($value instanceof \Illuminate\Http\UploadedFile) {
                $sanitized[$key] = [
                    'name' => $value->getClientOriginalName(),
                    'size' => $value->getSize(),
                    'mime' => $value->getClientMimeType(),
                ];
                continue;
            }

            $sanitized[$key] = $value;
        }

        return $sanitized;
    }

    private function summarizeFiles(array $files): array
    {
        $summary = [];

        foreach ($files as $key => $file) {
            if (is_array($file)) {
                $summary[$key] = $this->summarizeFiles($file);
                continue;
            }

            $summary[$key] = [
                'name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getClientMimeType(),
            ];
        }

        return $summary;
    }

    private function isSensitiveKey(string $key): bool
    {
        if (in_array($key, self::SENSITIVE_KEYS, true)) {
            return true;
        }

        return str_contains($key, 'password')
            || str_contains($key, 'token')
            || str_contains($key, 'signature');
    }
}
