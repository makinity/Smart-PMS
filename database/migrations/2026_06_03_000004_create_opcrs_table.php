<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Superseded by 2026_06_05_010845_recreate_opcrs_and_pivot_table.
        // Keep as a no-op so the schema is created once by the later migration.
    }

    public function down(): void
    {
        // No-op for the same reason as up().
    }
};
