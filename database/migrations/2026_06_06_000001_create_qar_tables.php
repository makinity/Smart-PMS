<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('qar_headers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('office_id')->constrained('offices')->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained('performance_periods')->cascadeOnDelete();
            $table->string('quarter_key', 20); // e.g. 2026-Q2
            $table->string('status', 30)->default('draft'); // draft, dept_head_endorsed, returned, pmt_approved
            $table->timestamp('generated_at')->nullable();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('pmt_status', 30)->default('pending'); // pending, validated, returned
            $table->timestamp('pmt_validated_at')->nullable();
            $table->foreignId('pmt_validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['office_id', 'performance_period_id', 'quarter_key']);
        });

        Schema::create('qar_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('qar_header_id')->constrained('qar_headers')->cascadeOnDelete();
            $table->string('ppa_code', 50)->nullable();
            $table->string('mfo_title')->nullable();
            $table->text('indicator_text')->nullable();
            $table->decimal('target_quantity', 12, 2)->nullable();
            $table->string('target_timeline')->nullable();
            $table->decimal('actual_performance', 12, 2)->default(0);
            $table->decimal('variance', 12, 2)->nullable();
            $table->text('remarks')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('qar_mpor_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('qar_header_id')->constrained('qar_headers')->cascadeOnDelete();
            $table->foreignId('mpor_id')->constrained('mpors')->cascadeOnDelete();
            $table->string('employee_name')->nullable();
            $table->string('month_label')->nullable();
            $table->string('status_label')->nullable();
            $table->timestamps();
            $table->unique(['qar_header_id', 'mpor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qar_mpor_links');
        Schema::dropIfExists('qar_rows');
        Schema::dropIfExists('qar_headers');
    }
};
