<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('accomplishment_submissions')
            ->where('status', 'supervisor_endorsed')
            ->update(['status' => 'supervisor_approved']);
    }

    public function down(): void
    {
        DB::table('accomplishment_submissions')
            ->where('status', 'supervisor_approved')
            ->update(['status' => 'supervisor_endorsed']);
    }
};
