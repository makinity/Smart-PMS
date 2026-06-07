<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('opcr_accomplishment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('office_id')->constrained('offices')->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('dept_head_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('draft'); // draft, submitted, released, returned
            $table->decimal('computed_office_rating', 5, 2)->nullable();
            $table->decimal('final_office_rating', 5, 2)->nullable();
            $table->string('final_adjectival_rating')->nullable();
            $table->text('dept_head_remarks')->nullable();
            $table->boolean('flagged_for_calibration')->default(false);
            $table->foreignId('pmt_member_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('pmt_remarks')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('pmt_action_at')->nullable();
            $table->timestamps();
            $table->unique(['office_id', 'performance_period_id'], 'opcr_acc_office_period_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opcr_accomplishment_submissions');
    }
};
