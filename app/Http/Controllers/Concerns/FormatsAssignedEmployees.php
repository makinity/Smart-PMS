<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use App\Services\AssignmentAi\AssignmentPredictorInterface;

/**
 * Shapes an assigned employee for the read-only "Assigned Employees" modal,
 * attaching the demo AI prediction (risk level / success probability).
 *
 * The host controller must expose an AssignmentPredictorInterface as
 * $this->assignmentPredictor (inject it via the constructor).
 */
trait FormatsAssignedEmployees
{
    protected function formatAssignedEmployee(?User $employee, int|string|null $indicatorId = null): ?array
    {
        if (! $employee) {
            return null;
        }

        return [
            'id' => $employee->id,
            'name' => $employee->name,
            'position' => $employee->position,
            'avatar' => $employee->profile_photo_url,
            'ai_prediction' => $this->resolveAssignmentPredictor()->predict(
                $employee,
                $indicatorId !== null ? ['success_indicator_id' => $indicatorId] : []
            ),
        ];
    }

    private function resolveAssignmentPredictor(): AssignmentPredictorInterface
    {
        return $this->assignmentPredictor
            ?? app(AssignmentPredictorInterface::class);
    }
}
