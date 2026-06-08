<?php

namespace App\Services\AssignmentAi;

use App\Models\User;

/**
 * PROTOTYPE / SAMPLE DATA — not machine learning.
 *
 * Produces a deterministic workload per employee so the assignment modal shows
 * stable success-probability and risk values. Replace with a real model by binding
 * a different AssignmentPredictorInterface implementation (see AppServiceProvider).
 *
 * To change the sample numbers, edit the load formula below, or the thresholds in
 * AssignmentPrediction.
 */
class SimulatedAssignmentPredictor implements AssignmentPredictorInterface
{
    public function predict(User $employee, array $context = []): array
    {
        $load = ((int) $employee->id * 17) % 80 + 15; // deterministic 15–94

        return AssignmentPrediction::make([
            'load' => $load,
            'source' => 'simulated',
        ]);
    }
}
