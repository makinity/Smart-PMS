<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('accomplishment_submissions')) {
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
        }

        if (!Schema::hasTable('accomplishment_submission_mpor')) {
            Schema::create('accomplishment_submission_mpor', function (Blueprint $table) {
                $table->unsignedBigInteger('accomplishment_submission_id');
                $table->unsignedBigInteger('mpor_id');
                $table->foreign('accomplishment_submission_id', 'asm_sub_fk')->references('id')->on('accomplishment_submissions')->cascadeOnDelete();
                $table->foreign('mpor_id', 'asm_mpor_fk')->references('id')->on('mpors')->cascadeOnDelete();
                $table->primary(['accomplishment_submission_id', 'mpor_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('accomplishment_submission_mpor');
        Schema::dropIfExists('accomplishment_submissions');
    }
};
