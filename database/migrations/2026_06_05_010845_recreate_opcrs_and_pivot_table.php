<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opcrs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('office_id')->constrained()->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('draft');
            $table->timestamps();

            $table->unique(['office_id', 'performance_period_id']);
        });

        Schema::create('opcr_unit_work_plan', function (Blueprint $table) {
            $table->foreignId('opcr_id')->constrained('opcrs')->cascadeOnDelete();
            $table->foreignId('unit_work_plan_id')->constrained('unit_work_plans')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['opcr_id', 'unit_work_plan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opcr_unit_work_plan');
        Schema::dropIfExists('opcrs');
    }
};
