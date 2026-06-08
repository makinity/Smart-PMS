<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('development_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ipcr_id')->constrained('ipcrs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('office_id')->nullable();
            $table->foreignId('performance_period_id')->nullable()->constrained()->nullOnDelete();

            // Snapshot of the failing rating that triggered the plan
            $table->decimal('source_score', 5, 2)->nullable();
            $table->string('source_rating')->nullable();

            // draft, pending_details, submitted_to_ld
            $table->string('status')->default('draft');
            $table->text('pmt_remarks')->nullable();

            // Annex H rows: [{performance_gap, developmental_activity, support_needed,
            //                 support_from_supervisor, expected_completion, results}]
            $table->json('idp_rows')->nullable();

            // Signature snapshots
            $table->string('prepared_by_name')->nullable();
            $table->string('recommended_by_name')->nullable();
            $table->string('approved_by_name')->nullable();

            // L&D handoff
            $table->string('lnd_sync_status')->default('not_sent'); // not_sent, sent, acknowledged, failed
            $table->string('lnd_reference_id')->nullable();
            $table->timestamp('lnd_synced_at')->nullable();
            $table->text('lnd_last_error')->nullable();
            $table->timestamp('submitted_to_ld_at')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('ipcr_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('development_plans');
    }
};
