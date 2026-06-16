<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('ml_model_logs', function (Blueprint $table) {
            $table->id();
            $table->string('source_type');       // 'sql' | 'csv'
            $table->string('target_column')->nullable();
            $table->string('status')->default('running'); // running | success | failed
            $table->unsignedInteger('row_count')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('trained_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('ml_model_logs');
    }
};
