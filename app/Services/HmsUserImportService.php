<?php

namespace App\Services;

use App\Mail\PmsEmployeeIdIssuedMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Throwable;

class HmsUserImportService
{
    public function import(array $records): array
    {
        $summary = [
            'total_processed' => 0,
            'total_created' => 0,
            'total_updated' => 0,
            'total_emailed' => 0,
            'failures' => [],
        ];

        foreach ($records as $record) {
            $summary['total_processed']++;

            $employeeId = trim((string) ($record['employee_id'] ?? ''));
            $name = trim((string) ($record['name'] ?? ''));
            $email = trim((string) ($record['email'] ?? ''));
            $role = trim((string) ($record['role'] ?? '')) ?: 'employee';

            try {
                if ($employeeId === '' || $name === '' || $email === '') {
                    throw new \InvalidArgumentException('employee_id, name, and email are required.');
                }

                $user = User::where('employee_id', $employeeId)->first();
                if (! $user) {
                    $user = User::where('email', $email)->first();
                }

                $attributes = [
                    'employee_id' => $employeeId,
                    'name' => $name,
                    'email' => $email,
                    'role' => $role,
                    'is_active' => false,
                    'activated_at' => null,
                ];

                if ($user) {
                    $user->fill($attributes);
                    $user->save();
                    $summary['total_updated']++;
                } else {
                    $user = User::create($attributes);
                    $summary['total_created']++;
                }

                Mail::to($email)->send(new PmsEmployeeIdIssuedMail($name, $employeeId, $email));
                $summary['total_emailed']++;
            } catch (Throwable $exception) {
                $summary['failures'][] = [
                    'employee_id' => $employeeId !== '' ? $employeeId : null,
                    'email' => $email !== '' ? $email : null,
                    'message' => $exception->getMessage(),
                ];
            }
        }

        return $summary;
    }
}
