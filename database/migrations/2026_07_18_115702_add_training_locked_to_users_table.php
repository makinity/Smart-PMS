<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // When true, the employee is locked out of PMS and redirected to L&D.
            // Set to true when PMT submits the employee's IDP to L&D.
            // Restored to false when L&D sends the training-complete callback.
            $table->boolean('training_locked')->default(false)->after('is_active');
            $table->string('lnd_reference_id')->nullable()->after('training_locked');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['training_locked', 'lnd_reference_id']);
        });
    }
};
