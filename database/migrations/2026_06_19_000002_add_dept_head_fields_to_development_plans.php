<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->foreignId('dept_head_id')->nullable()->after('supervisor_id')->constrained('users')->nullOnDelete();
            $table->text('dept_head_remarks')->nullable()->after('supervisor_action_at');
            $table->timestamp('dept_head_action_at')->nullable()->after('dept_head_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('dept_head_id');
            $table->dropColumn(['dept_head_remarks', 'dept_head_action_at']);
        });
    }
};
