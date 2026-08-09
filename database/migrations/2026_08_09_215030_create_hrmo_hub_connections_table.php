<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrmo_hub_connections', function (Blueprint $table) {
            $table->id();
            $table->string('pillar', 20);           // rsp, pms, rnr, ld
            $table->string('name');                  // Display name
            $table->string('base_url')->nullable();
            $table->text('token')->nullable();       // Encrypted access token
            $table->string('status', 20)->default('disconnected'); // connected, disconnected, built_in
            $table->timestamp('last_sync_at')->nullable();
            $table->json('last_sync_result')->nullable();
            $table->json('config')->nullable();      // Pillar-specific settings
            $table->timestamps();

            $table->unique('pillar');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hrmo_hub_connections');
    }
};
