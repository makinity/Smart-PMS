<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opcrs', function (Blueprint $table) {
            $table->text('return_remarks')->nullable()->after('status');
            $table->unsignedBigInteger('returned_by')->nullable()->after('return_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('opcrs', function (Blueprint $table) {
            $table->dropColumn(['return_remarks', 'returned_by']);
        });
    }
};
