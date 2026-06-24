<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('accomplishment_submissions')
            ->where('status', 'dept_head_endorsed')
            ->update(['status' => 'dept_head_approved']);
    }

    public function down(): void
    {
        DB::table('accomplishment_submissions')
            ->where('status', 'dept_head_approved')
            ->update(['status' => 'dept_head_endorsed']);
    }
};
