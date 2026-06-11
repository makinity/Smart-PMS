<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_performance_snapshots', function (Blueprint $table) {
            // Allow null so synthetic/seeded ML training rows don't need a real period FK
            $table->foreignId('performance_period_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('employee_performance_snapshots', function (Blueprint $table) {
            $table->foreignId('performance_period_id')->nullable(false)->change();
        });
    }
};
