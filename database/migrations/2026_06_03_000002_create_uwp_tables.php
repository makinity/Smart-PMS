<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offices', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->nullable();
            $table->unsignedBigInteger('head_id')->nullable();
            $table->timestamps();
        });

        Schema::create('performance_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('unit_work_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('office_id');
            $table->unsignedBigInteger('performance_period_id');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->string('ratee_name')->nullable();
            $table->string('period_covered')->nullable();
            $table->string('pgdh_name')->nullable();
            $table->string('status')->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('endorsed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->unsignedBigInteger('returned_by')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();

            $table->foreign('office_id')->references('id')->on('offices')->cascadeOnDelete();
            $table->foreign('performance_period_id')->references('id')->on('performance_periods')->cascadeOnDelete();
        });

        Schema::create('uwp_functions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('unit_work_plan_id');
            $table->string('name');
            $table->string('function_type')->default('core'); // core | support
            $table->decimal('weight_percent', 5, 2)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('unit_work_plan_id')->references('id')->on('unit_work_plans')->cascadeOnDelete();
        });

        Schema::create('uwp_mfos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('uwp_function_id');
            $table->text('title');
            $table->decimal('weight_percent', 5, 2)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('uwp_function_id')->references('id')->on('uwp_functions')->cascadeOnDelete();
        });

        Schema::create('uwp_success_indicators', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('uwp_mfo_id');
            $table->text('indicator_text');
            $table->string('target_quantity')->nullable();
            $table->text('target_timeline')->nullable();
            $table->decimal('allotted_budget', 15, 2)->nullable();
            $table->string('baseline')->nullable();
            $table->string('reference_code')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('uwp_mfo_id')->references('id')->on('uwp_mfos')->cascadeOnDelete();
        });

        Schema::create('uwp_qet_standards', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('uwp_success_indicator_id');
            $table->string('dimension'); // quality | efficiency | timeliness
            $table->unsignedTinyInteger('rating'); // 1–5
            $table->text('standard_text');
            $table->timestamps();

            $table->foreign('uwp_success_indicator_id')->references('id')->on('uwp_success_indicators')->cascadeOnDelete();
            $table->unique(['uwp_success_indicator_id', 'dimension', 'rating'], 'uwp_qet_uniq');
        });

        Schema::create('uwp_indicator_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('uwp_success_indicator_id');
            $table->unsignedBigInteger('employee_id');
            $table->unsignedBigInteger('assigned_by')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamps();

            $table->foreign('uwp_success_indicator_id')->references('id')->on('uwp_success_indicators')->cascadeOnDelete();
            $table->unique(['uwp_success_indicator_id', 'employee_id'], 'uwp_indicator_assignments_unique');
        });

        Schema::create('uwp_consolidation_signatures', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('unit_work_plan_id');
            $table->unsignedBigInteger('opcr_id')->nullable();
            $table->unsignedBigInteger('signed_by')->nullable();
            $table->string('signature_image_path')->nullable();
            $table->string('signed_excel_path')->nullable();
            $table->string('signature_hash')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('unit_work_plan_id')->references('id')->on('unit_work_plans')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uwp_consolidation_signatures');
        Schema::dropIfExists('uwp_indicator_assignments');
        Schema::dropIfExists('uwp_qet_standards');
        Schema::dropIfExists('uwp_success_indicators');
        Schema::dropIfExists('uwp_mfos');
        Schema::dropIfExists('uwp_functions');
        Schema::dropIfExists('unit_work_plans');
        Schema::dropIfExists('performance_periods');
        Schema::dropIfExists('offices');
    }
};
