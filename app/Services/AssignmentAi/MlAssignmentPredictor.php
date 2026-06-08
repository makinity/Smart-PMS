<?php

namespace App\Services\AssignmentAi;

use App\Models\User;

/**
 * Real machine-learning predictor — STUB.
 *
 * Fill `predict()` with the actual inference once your model and datasets are ready
 * (call a Python service, load an ONNX model, query a features table, etc.), then
 * map the output through AssignmentPrediction::make([...]) so it returns the same
 * shape the UI already consumes. Set 'source' => 'ml'.
 *
 * To switch the app over, change the binding in AppServiceProvider from
 * SimulatedAssignmentPredictor to this class (or wrap both in a composite that
 * falls back to the simulation when the model has no prediction for an employee).
 */
class MlAssignmentPredictor implements AssignmentPredictorInterface
{
    public function predict(User $employee, array $context = []): array
    {
        // TODO: replace with real inference. Example once features are available:
        //
        //   $features = $this->featureStore->forEmployee($employee, $context);
        //   $result   = $this->model->infer($features); // ['load' => .., 'success_prob' => ..]
        //   return AssignmentPrediction::make([
        //       'load'         => $result['load'],
        //       'success_prob' => $result['success_prob'],
        //       'source'       => 'ml',
        //   ]);

        throw new \LogicException('MlAssignmentPredictor is not implemented yet. Bind SimulatedAssignmentPredictor until the model is ready.');
    }
}
