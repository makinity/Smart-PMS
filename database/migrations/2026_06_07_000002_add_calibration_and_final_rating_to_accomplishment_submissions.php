<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('accomplishment_submissions', function (Blueprint $table) {
            $table->boolean('dept_head_flagged_for_calibration')->default(false)->after('dept_head_action_at');
            $table->decimal('final_rating', 5, 2)->nullable()->after('pmt_action_at');
            $table->string('final_adjectival_rating')->nullable()->after('final_rating');
        });
    }

    public function down(): void
    {
        Schema::table('accomplishment_submissions', function (Blueprint $table) {
            $table->dropColumn(['dept_head_flagged_for_calibration', 'final_rating', 'final_adjectival_rating']);
        });
    }
};
