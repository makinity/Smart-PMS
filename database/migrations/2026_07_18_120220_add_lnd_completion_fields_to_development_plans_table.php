<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->timestamp('lnd_completed_at')->nullable()->after('submitted_to_ld_at');
            $table->text('lnd_completion_remarks')->nullable()->after('lnd_completed_at');
            $table->json('lnd_courses_completed')->nullable()->after('lnd_completion_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->dropColumn(['lnd_completed_at', 'lnd_completion_remarks', 'lnd_courses_completed']);
        });
    }
};
