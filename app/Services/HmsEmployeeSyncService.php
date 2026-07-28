<?php

namespace App\Services;

use App\Mail\PmsEmployeeIdIssuedMail;
use App\Models\Employee;
use App\Models\Office;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class HmsEmployeeSyncService
{
    public function sync(string $baseUrl, string $token): array
    {
        $summary = [
            'fetched'  => 0,
            'created'  => 0,
            'updated'  => 0,
            'skipped'  => 0,
            'failed'   => 0,
            'failures' => [],
        ];

        $records = $this->fetchEmployees($baseUrl, $token);
        $summary['fetched'] = $records->count();

        foreach ($records as $record) {
            try {
                $this->syncOne((array) $record, $summary);
            } catch (\Throwable $e) {
                $summary['failed']++;
                $summary['failures'][] = [
                    'employee_no' => (string) (($record['employee_no'] ?? '') ?: ($record['id'] ?? '')),
                    'message'     => $e->getMessage(),
                ];
            }
        }

        return $summary;
    }

    private function fetchEmployees(string $baseUrl, string $token): Collection
    {
        $normalizedBaseUrl = rtrim(trim($baseUrl), '/');
        $records  = collect();
        $page     = 1;
        $lastPage = 1;

        do {
            $response = Http::acceptJson()
                ->withToken(trim($token))
                ->timeout(20)
                ->get($normalizedBaseUrl . '/employees', [
                    'page'             => $page,
                    'per_page'         => 100,
                    'include_inactive' => 'true',
                ]);

            if (! $response->successful()) {
                throw new \RuntimeException('HMS employee sync failed with HTTP ' . $response->status() . '.');
            }

            $payload = $response->json();
            $data    = data_get($payload, 'data', []);
            if (! is_array($data)) {
                throw new \RuntimeException('HMS employee sync failed: invalid employees payload.');
            }

            $records  = $records->concat($data);
            $lastPage = (int) (data_get($payload, 'meta.last_page') ?? data_get($payload, 'last_page') ?? 1);
            $page++;
        } while ($page <= max(1, $lastPage));

        return $records->values();
    }

    private function syncOne(array $record, array &$summary): void
    {
        $hmsEmployeeId = (int) ($record['id'] ?? 0);
        $employeeNo    = trim((string) ($record['employee_no'] ?? ''));
        $name          = trim((string) ($record['full_name'] ?? ''));
        $email         = Str::lower(trim((string) ($record['email'] ?? '')));
        $officeCode    = trim((string) ($record['office_code'] ?? ''));
        $position      = trim((string) ($record['position_title'] ?? ''));
        $remoteActive  = filter_var($record['is_active'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

        // Split full_name into parts: first word = first name, last word = last name, rest = middle
        $nameParts  = preg_split('/\s+/', $name, -1, PREG_SPLIT_NO_EMPTY);
        $firstName  = count($nameParts) >= 1 ? $nameParts[0] : null;
        $lastName   = count($nameParts) >= 2 ? $nameParts[count($nameParts) - 1] : null;
        $middleName = count($nameParts) >= 3 ? implode(' ', array_slice($nameParts, 1, -1)) : null;

        if ($hmsEmployeeId <= 0 || $employeeNo === '' || $name === '' || $officeCode === '') {
            throw new \InvalidArgumentException('Missing required HMS employee fields.');
        }

        $office = Office::query()
            ->whereRaw('LOWER(code) = ?', [Str::lower($officeCode)])
            ->first();

        if (! $office) {
            $summary['skipped']++;
            $summary['failures'][] = [
                'employee_no' => $employeeNo,
                'message'     => 'Skipped: office code [' . $officeCode . '] is not mapped in PMS.',
            ];
            return;
        }

        // ── Try to find the existing user via Employee ────────────────────────
        $employee = Employee::query()->where('hms_employee_id', $hmsEmployeeId)->first();

        if (! $employee && $email !== '') {
            // Fall back to matching via user email
            $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
            $employee = $user?->employee;
        }

        if ($employee) {
            // ── Update existing employee + user ───────────────────────────────
            $user = $employee->user;

            $user->name = $name;
            if ($email !== '') {
                $user->email = $email;
            }
            $user->save();

            $employee->hms_employee_id = $hmsEmployeeId;
            $employee->first_name      = $firstName ?? $employee->first_name;
            $employee->middle_name     = $middleName ?? $employee->middle_name;
            $employee->last_name       = $lastName ?? $employee->last_name;
            $employee->office_id       = $office->id;
            $employee->position        = $position !== '' ? $position : $employee->position;

            if (strtolower((string) $user->role) === 'employee') {
                $employee->is_active = $remoteActive ?? $employee->is_active;
            }

            $employee->save();
            $summary['updated']++;
            return;
        }

        // ── Create new user + employee ────────────────────────────────────────
        $user = User::create([
            'name'     => $name,
            'email'    => $email !== '' ? $email : null,
            'password' => Hash::make(Str::random(48)),
            'role'     => 'employee',
        ]);

        Employee::create([
            'user_id'         => $user->id,
            'employee_id'     => $this->generateNextEmployeeId(),
            'hms_employee_id' => $hmsEmployeeId,
            'first_name'      => $firstName,
            'middle_name'     => $middleName,
            'last_name'       => $lastName,
            'office_id'       => $office->id,
            'position'        => $position !== '' ? $position : null,
            'is_active'       => false,
            'activated_at'    => null,
        ]);

        if ($email !== '') {
            $generatedEmployeeId = Employee::where('user_id', $user->id)->value('employee_id');
            try {
                Mail::to($email)->queue(new PmsEmployeeIdIssuedMail(
                    name: $name,
                    employeeId: (string) $generatedEmployeeId,
                    email: $email,
                ));
            } catch (\Throwable $e) {
                // Mail queue failure should not block the sync
            }
        }

        $summary['created']++;
    }

    private function generateNextEmployeeId(): string
    {
        $year   = now()->format('Y');
        $prefix = 'EMP-' . $year . '-';

        $maxSequence = Employee::query()
            ->where('employee_id', 'like', $prefix . '%')
            ->pluck('employee_id')
            ->map(function ($employeeId) use ($prefix) {
                if (! is_string($employeeId) || ! str_starts_with($employeeId, $prefix)) {
                    return 0;
                }
                $suffix = substr($employeeId, strlen($prefix));
                return ctype_digit($suffix) ? (int) $suffix : 0;
            })
            ->max() ?? 0;

        return $prefix . str_pad((string) ($maxSequence + 1), 5, '0', STR_PAD_LEFT);
    }
}
