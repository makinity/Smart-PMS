<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One IPCR per employee per performance period
        Schema::create('ipcrs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('opcr_id')->constrained('opcrs')->cascadeOnDelete();
            $table->foreignId('performance_period_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('draft'); // draft, committed
            $table->timestamp('committed_at')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'performance_period_id']);
        });

        // Snapshot of assigned indicators (denormalized for performance)
        Schema::create('ipcr_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ipcr_id')->constrained('ipcrs')->cascadeOnDelete();
            $table->foreignId('uwp_success_indicator_id')->constrained('uwp_success_indicators')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ipcr_items');
        Schema::dropIfExists('ipcrs');
    }
};
