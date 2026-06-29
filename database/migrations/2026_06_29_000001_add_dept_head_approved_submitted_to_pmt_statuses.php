<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support ALTER COLUMN, so we just ensure the new statuses
        // are valid by updating the status check constraint via a data-only migration.
        // The status column is a plain string — no enum — so no schema change needed.
        // This migration is a no-op for schema but documents the new status values.

        // Rename existing 'approved' records to 'dept_head_approved' for the new flow.
        // Only rename records that have NOT yet been submitted to L&D (those stay as-is).
        DB::table('development_plans')
            ->where('status', 'approved')
            ->whereNull('submitted_to_ld_at')
            ->update(['status' => 'dept_head_approved']);
    }

    public function down(): void
    {
        DB::table('development_plans')
            ->where('status', 'dept_head_approved')
            ->update(['status' => 'approved']);

        DB::table('development_plans')
            ->where('status', 'submitted_to_pmt')
            ->update(['status' => 'approved']);
    }
};
