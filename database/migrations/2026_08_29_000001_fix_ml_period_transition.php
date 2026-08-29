<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── Fix 1: employee_performance_snapshots ─────────────────────────────
        // employee_id must be nullable so CSV-uploaded training rows (which have
        // no real user IDs) don't violate the FK constraint.
        Schema::table('employee_performance_snapshots', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable()->change();
        });

        // ── Fix 2 & 3: ml_kpi_predictions ────────────────────────────────────
        // performance_period_id must be nullable (CSV training has no period).
        // The unique key must be per-indicator only — not per (indicator, period)
        // — so ON DUPLICATE KEY UPDATE fires correctly across period transitions.
        // MySQL uses the composite unique index as the backing index for the uwp FK,
        // so we must drop that FK first before we can drop the unique index.
        DB::statement('ALTER TABLE ml_kpi_predictions DROP FOREIGN KEY ml_kpi_predictions_uwp_success_indicator_id_foreign');
        DB::statement('ALTER TABLE ml_kpi_predictions DROP INDEX ml_pred_indicator_period_unique');
        DB::statement('ALTER TABLE ml_kpi_predictions MODIFY performance_period_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE ml_kpi_predictions ADD UNIQUE KEY ml_pred_indicator_unique (uwp_success_indicator_id)');
        DB::statement('ALTER TABLE ml_kpi_predictions ADD CONSTRAINT ml_kpi_predictions_uwp_success_indicator_id_foreign FOREIGN KEY (uwp_success_indicator_id) REFERENCES uwp_success_indicators (id) ON DELETE CASCADE');
    }

    public function down(): void
    {
        Schema::table('employee_performance_snapshots', function (Blueprint $table) {
            $table->foreignId('employee_id')->nullable(false)->change();
        });

        DB::statement('ALTER TABLE ml_kpi_predictions DROP FOREIGN KEY ml_kpi_predictions_uwp_success_indicator_id_foreign');
        DB::statement('ALTER TABLE ml_kpi_predictions DROP INDEX ml_pred_indicator_unique');
        DB::statement('ALTER TABLE ml_kpi_predictions MODIFY performance_period_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE ml_kpi_predictions ADD UNIQUE KEY ml_pred_indicator_period_unique (uwp_success_indicator_id, performance_period_id)');
        DB::statement('ALTER TABLE ml_kpi_predictions ADD CONSTRAINT ml_kpi_predictions_uwp_success_indicator_id_foreign FOREIGN KEY (uwp_success_indicator_id) REFERENCES uwp_success_indicators (id) ON DELETE CASCADE');
    }
};
