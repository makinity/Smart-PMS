<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accomplishment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('office_id')->constrained('offices');
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ipcr_id')->nullable()->constrained('ipcrs')->nullOnDelete();
            $table->string('dataset_source')->default('submitted_mpor_preview');
            $table->foreignId('qar_header_id')->nullable()->constrained('qar_headers')->nullOnDelete();
            $table->string('status')->default('draft');
            $table->text('employee_remarks')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('supervisor_remarks')->nullable();
            $table->timestamp('supervisor_action_at')->nullable();
            $table->foreignId('dept_head_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('dept_head_remarks')->nullable();
            $table->timestamp('dept_head_action_at')->nullable();
            $table->foreignId('pmt_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('pmt_remarks')->nullable();
            $table->timestamp('pmt_action_at')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'performance_period_id']);
        });

        Schema::create('accomplishment_submission_mpor', function (Blueprint $table) {
            $table->foreignId('accomplishment_submission_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mpor_id')->constrained('mpors')->cascadeOnDelete();
            $table->primary(['accomplishment_submission_id', 'mpor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accomplishment_submission_mpor');
        Schema::dropIfExists('accomplishment_submissions');
    }
};
