<?php

namespace App\Services;

use App\Mail\PmsEmployeeIdIssuedMail;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class HmsUserImportService
{
    public function import(array $records): array
    {
        $summary = [
            'total_processed' => 0,
            'total_created'   => 0,
            'total_updated'   => 0,
            'total_emailed'   => 0,
            'failures'        => [],
        ];

        foreach ($records as $record) {
            $summary['total_processed']++;

            $employeeId = trim((string) ($record['employee_id'] ?? ''));
            $name       = trim((string) ($record['name'] ?? ''));
            $email      = trim((string) ($record['email'] ?? ''));
            $role       = trim((string) ($record['role'] ?? '')) ?: 'employee';

            try {
                if ($employeeId === '' || $name === '' || $email === '') {
                    throw new \InvalidArgumentException('employee_id, name, and email are required.');
                }

                // Try to find existing user by employee_id (via employees table) or by email
                $employee = Employee::where('employee_id', $employeeId)->first();
                $user     = $employee?->user ?? User::where('email', $email)->first();

                if ($user) {
                    // Update user auth fields
                    $user->fill(['name' => $name, 'email' => $email, 'role' => $role]);
                    $user->save();

                    // Update or create employee record
                    $emp = $user->employee ?? Employee::make(['user_id' => $user->id]);
                    $emp->fill([
                        'user_id'     => $user->id,
                        'employee_id' => $employeeId,
                        'is_active'   => false,
                        'activated_at'=> null,
                    ]);
                    $emp->save();

                    $summary['total_updated']++;
                } else {
                    // Create user
                    $user = User::create([
                        'name'     => $name,
                        'email'    => $email,
                        'role'     => $role,
                        'password' => Hash::make(Str::random(48)),
                    ]);

                    // Create employee record
                    Employee::create([
                        'user_id'     => $user->id,
                        'employee_id' => $employeeId,
                        'is_active'   => false,
                        'activated_at'=> null,
                    ]);

                    $summary['total_created']++;
                }

                Mail::to($email)->send(new PmsEmployeeIdIssuedMail($name, $employeeId, $email));
                $summary['total_emailed']++;
            } catch (Throwable $exception) {
                $summary['failures'][] = [
                    'employee_id' => $employeeId !== '' ? $employeeId : null,
                    'email'       => $email !== '' ? $email : null,
                    'message'     => $exception->getMessage(),
                ];
            }
        }

        return $summary;
    }
}
