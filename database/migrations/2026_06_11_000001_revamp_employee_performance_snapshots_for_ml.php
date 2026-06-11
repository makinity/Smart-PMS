<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_performance_snapshots', function (Blueprint $table) {

            // ── Employee context (richer features for RF) ─────────────────────
            $table->string('position')->nullable()->after('ipcr_id');         // seniority/role
            $table->string('office_name')->nullable()->after('position');      // human-readable, for history display

            // ── Previous period outcome (trend feature) ───────────────────────
            $table->decimal('previous_final_score', 5, 2)->nullable()->after('office_size');
            $table->string('previous_adjectival_rating')->nullable()->after('previous_final_score');

            // ── Workload at time of assignment ────────────────────────────────
            $table->unsignedInteger('current_workload_count')->nullable()->after('employee_count_assigned');
            // ^ how many indicators already assigned to this employee this period

            // ── Calibration signal ────────────────────────────────────────────
            $table->boolean('was_flagged_for_calibration')->default(false)->after('current_workload_count');

            // ── ML label (derived from final_score, computed on insert) ───────
            // achievable = score >= 4.0 | at_risk = 3.0–3.99 | unrealistic = < 3.0
            $table->string('feasibility_label')->nullable()->after('adjectival_rating');
            // ^ "achievable" | "at_risk" | "unrealistic"

            // ── UWP linkage (connects snapshot to the specific indicator) ─────
            $table->foreignId('uwp_success_indicator_id')
                  ->nullable()
                  ->after('ipcr_id')
                  ->constrained('uwp_success_indicators')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employee_performance_snapshots', function (Blueprint $table) {
            $table->dropConstrainedForeignId('uwp_success_indicator_id');
            $table->dropColumn([
                'position', 'office_name',
                'previous_final_score', 'previous_adjectival_rating',
                'current_workload_count', 'was_flagged_for_calibration',
                'feasibility_label',
            ]);
        });
    }
};
