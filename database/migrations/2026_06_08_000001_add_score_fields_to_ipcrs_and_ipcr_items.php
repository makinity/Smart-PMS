<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ipcrs', function (Blueprint $table) {
            $table->decimal('final_score', 5, 2)->nullable()->after('committed_at');
            $table->string('adjectival_rating')->nullable()->after('final_score');
            $table->decimal('pmt_adjusted_score', 5, 2)->nullable()->after('adjectival_rating');
            $table->string('pmt_adjusted_rating')->nullable()->after('pmt_adjusted_score');
        });

        Schema::table('ipcr_items', function (Blueprint $table) {
            $table->string('output_title')->nullable()->after('uwp_success_indicator_id');
            $table->text('indicator_text')->nullable()->after('output_title');
            $table->unsignedBigInteger('uwp_function_id')->nullable()->after('indicator_text');
        });
    }

    public function down(): void
    {
        Schema::table('ipcrs', function (Blueprint $table) {
            $table->dropColumn(['final_score', 'adjectival_rating', 'pmt_adjusted_score', 'pmt_adjusted_rating']);
        });

        Schema::table('ipcr_items', function (Blueprint $table) {
            $table->dropColumn(['output_title', 'indicator_text', 'uwp_function_id']);
        });
    }
};
