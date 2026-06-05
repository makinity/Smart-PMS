<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_work_plans', function (Blueprint $table) {
            $table->text('return_remarks')->nullable()->after('returned_by');
        });
    }

    public function down(): void
    {
        Schema::table('unit_work_plans', function (Blueprint $table) {
            $table->dropColumn('return_remarks');
        });
    }
};
