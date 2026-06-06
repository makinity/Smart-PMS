<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ors_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('supervisor_id')->constrained('users');
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ipcr_id')->constrained('ipcrs')->cascadeOnDelete();
            $table->foreignId('ipcr_item_id')->constrained('ipcr_items')->cascadeOnDelete();
            $table->date('work_date');
            $table->text('notes')->nullable();
            $table->string('quantity')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->unsignedInteger('total_seconds')->default(0);
            $table->string('status')->default('draft'); // draft, recording, paused, submitted, rated
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ors_entry_evidences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ors_entry_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedInteger('file_size')->nullable();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ors_entry_monitorings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ors_entry_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supervisor_id')->constrained('users');
            $table->tinyInteger('quality_rating')->nullable();
            $table->tinyInteger('timeliness_rating')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamp('rated_at')->nullable();
            $table->timestamps();

            $table->unique(['ors_entry_id', 'supervisor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ors_entry_monitorings');
        Schema::dropIfExists('ors_entry_evidences');
        Schema::dropIfExists('ors_entries');
    }
};
