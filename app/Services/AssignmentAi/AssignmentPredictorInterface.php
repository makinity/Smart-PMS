<?php

namespace App\Services\AssignmentAi;

use App\Models\User;

interface AssignmentPredictorInterface
{
    /**
     * Predict assignment suitability for an employee.
     *
     * Returns an array shaped:
     *   [
     *     'load'         => int,    // 0–100 estimated current workload
     *     'success_prob' => int,    // 0–100 probability of on-time completion
     *     'risk'         => string, // 'Low' | 'Medium' | 'High'
     *     'status'       => string, // 'Available' | 'Busy' | 'Critical'
     *     'warning'      => bool,   // high risk — confirm before assigning
     *     'source'       => string, // 'ml' | 'simulated'
     *   ]
     *
     * @param  array<string,mixed>  $context  e.g. ['indicator_id' => 12]
     */
    public function predict(User $employee, array $context = []): array;
}
