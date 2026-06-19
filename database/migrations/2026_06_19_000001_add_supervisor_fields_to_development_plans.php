<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->foreignId('supervisor_id')->nullable()->after('employee_id')->constrained('users')->nullOnDelete();
            $table->text('supervisor_remarks')->nullable()->after('pmt_remarks');
            $table->timestamp('supervisor_action_at')->nullable()->after('supervisor_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supervisor_id');
            $table->dropColumn(['supervisor_remarks', 'supervisor_action_at']);
        });
    }
};
