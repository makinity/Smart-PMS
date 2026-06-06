<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('qar_headers', function (Blueprint $table) {
            $table->text('return_remarks')->nullable()->after('pmt_validated_by');
        });
    }
    public function down(): void
    {
        Schema::table('qar_headers', function (Blueprint $table) {
            $table->dropColumn('return_remarks');
        });
    }
};
