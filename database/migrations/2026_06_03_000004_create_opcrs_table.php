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
            $table->string('status')->default('draft'); // draft, submitted, approved
            $table->timestamps();

            $table->unique(['office_id', 'performance_period_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opcrs');
    }
};
