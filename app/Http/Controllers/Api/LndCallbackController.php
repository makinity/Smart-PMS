<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DevelopmentPlan;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LndCallbackController extends Controller
{
    /**
     * Receive training completion callback from the L&D system.
     *
     * L&D POSTs here when an employee finishes all their training.
     * This unlocks the employee's PMS account and marks their IDP as completed.
     *
     * Authorization: Bearer {PMS_CALLBACK_TOKEN}
     */
    public function completeTraining(Request $request)
    {
        $data = $request->validate([
            'pms_user_id'        => ['required', 'integer'],
            'lnd_reference_id'   => ['required', 'string'],
            'external_plan_id'   => ['required', 'string'],
            'completed_at'       => ['required', 'date'],
            'courses_completed'  => ['present', 'array'],
            'courses_completed.*.course_code' => ['nullable', 'string'],
            'courses_completed.*.title'       => ['nullable', 'string'],
            'courses_completed.*.completed_at'=> ['nullable', 'date'],
            'trainer_remarks'    => ['nullable', 'string', 'max:5000'],
        ]);

        // Look up the employee
        $employee = User::find($data['pms_user_id']);

        if (! $employee) {
            Log::warning('[LND Callback] Employee not found', ['pms_user_id' => $data['pms_user_id']]);

            return response()->json([
                'ok'      => false,
                'message' => 'Employee not found.',
            ], 404);
        }

        // Look up the development plan — match by lnd_reference_id first, fall back to external_plan_id
        $planId = str_replace('PMS-DP-', '', $data['external_plan_id']);

        $plan = DevelopmentPlan::where('lnd_reference_id', $data['lnd_reference_id'])
            ->orWhere(function ($q) use ($planId, $data) {
                $q->where('id', is_numeric($planId) ? (int) $planId : 0)
                  ->where('employee_id', $data['pms_user_id']);
            })
            ->where('employee_id', $data['pms_user_id'])
            ->first();

        if (! $plan) {
            Log::warning('[LND Callback] Development plan not found', $data);

            return response()->json([
                'ok'      => false,
                'message' => 'Development plan not found.',
            ], 404);
        }

        // Update the development plan
        $plan->update([
            'status'                  => DevelopmentPlan::STATUS_COMPLETED,
            'lnd_completed_at'        => $data['completed_at'],
            'lnd_completion_remarks'  => $data['trainer_remarks'] ?? null,
            'lnd_courses_completed'   => $data['courses_completed'] ?? [],
            'updated_by'              => null,
        ]);

        // Unlock the employee's PMS account.
        // training_locked and lnd_reference_id live on the employees table, not users.
        $employee->employee?->update([
            'training_locked'  => false,
            'lnd_reference_id' => null,
        ]);

        // Notify the employee
        $employee->notify(new WorkflowEventNotification(
            type: 'success',
            event: 'development_plan.training_completed',
            message: 'Your L&D training has been completed. Your PMS account access has been restored.',
            url: '/employee/idp',
        ));

        Log::info('[LND Callback] Training completed — account unlocked', [
            'employee_id'      => $employee->id,
            'plan_id'          => $plan->id,
            'lnd_reference_id' => $data['lnd_reference_id'],
        ]);

        return response()->json([
            'ok'      => true,
            'message' => 'Training completion recorded.',
        ]);
    }
}
