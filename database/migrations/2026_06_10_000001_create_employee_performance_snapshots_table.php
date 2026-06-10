<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_performance_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ipcr_id')->nullable()->constrained('ipcrs')->nullOnDelete();

            // Denormalized indicator context (for ML text similarity)
            $table->text('indicator_text')->nullable();
            $table->string('function_type')->nullable();   // "core" | "support"
            $table->string('mfo_title')->nullable();       // e.g. "RSP"
            $table->unsignedInteger('target_quantity')->nullable();
            $table->unsignedInteger('target_timeline_days')->nullable();

            // Denormalized office context (for ML numeric features)
            $table->unsignedInteger('office_size')->nullable();
            $table->unsignedInteger('employee_count_assigned')->nullable();

            // Outcome (the ML label / target variable)
            $table->decimal('final_score', 5, 2)->nullable();
            $table->string('adjectival_rating')->nullable();

            $table->timestamps();

            $table->index(['employee_id', 'performance_period_id'], 'eps_emp_period_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_performance_snapshots');
    }
};
