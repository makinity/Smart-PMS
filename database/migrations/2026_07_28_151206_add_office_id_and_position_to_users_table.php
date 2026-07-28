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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'office_id')) {
                $table->foreignId('office_id')->nullable()->constrained('offices')->nullOnDelete()->after('role');
            }
            if (! Schema::hasColumn('users', 'position')) {
                $table->string('position')->nullable()->after('office_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'position')) {
                $table->dropColumn('position');
            }
            if (Schema::hasColumn('users', 'office_id')) {
                $table->dropForeign(['office_id']);
                $table->dropColumn('office_id');
            }
        });
    }
};
