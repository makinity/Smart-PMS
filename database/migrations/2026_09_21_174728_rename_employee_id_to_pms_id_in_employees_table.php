<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'employee_id') && ! Schema::hasColumn('employees', 'pms_id')) {
                $table->renameColumn('employee_id', 'pms_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'pms_id') && ! Schema::hasColumn('employees', 'employee_id')) {
                $table->renameColumn('pms_id', 'employee_id');
            }
        });
    }
};
