<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offices', function (Blueprint $table) {
            if (! Schema::hasColumn('offices', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('code');
            }
            if (! Schema::hasColumn('offices', 'hris_id')) {
                $table->string('hris_id')->nullable()->unique()->after('is_active');
            }
            if (! Schema::hasColumn('offices', 'hris_synced_at')) {
                $table->timestamp('hris_synced_at')->nullable()->after('hris_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('offices', function (Blueprint $table) {
            foreach (['hris_synced_at', 'hris_id', 'is_active'] as $column) {
                if (Schema::hasColumn('offices', $column)) {
                    if ($column === 'hris_id') {
                        $table->dropUnique('offices_hris_id_unique');
                    }
                    $table->dropColumn($column);
                }
            }
        });
    }
};
