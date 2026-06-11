<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ml_kpi_predictions', function (Blueprint $table) {
            $table->id();

            // ── What KPI was assessed ─────────────────────────────────────────
            $table->foreignId('uwp_success_indicator_id')
                  ->constrained('uwp_success_indicators')
                  ->cascadeOnDelete();
            $table->foreignId('performance_period_id')
                  ->constrained()
                  ->cascadeOnDelete();

            // ── KPI Feasibility output (Objective 6.2, 6.3, 6.4) ─────────────
            $table->string('feasibility_label');
            // "achievable" | "at_risk" | "unrealistic"

            $table->decimal('feasibility_probability', 5, 4);
            // e.g. 0.8700 = 87% confidence

            $table->string('risk_level');
            // "Low" | "Medium" | "High"

            // ── Employee recommendations (Objective 6.5) ──────────────────────
            // Ranked list: [{employee_id, fit_score, fit_label, predicted_rating}]
            $table->json('recommendations');

            // ── Model metadata ────────────────────────────────────────────────
            $table->string('model_version')->default('1.0.0');
            $table->timestamp('generated_at')->useCurrent();

            $table->timestamps();

            // One prediction per indicator per period (FastAPI overwrites on retrain)
            $table->unique(['uwp_success_indicator_id', 'performance_period_id'], 'ml_pred_indicator_period_unique');

            $table->index('feasibility_label');
            $table->index('risk_level');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ml_kpi_predictions');
    }
};
