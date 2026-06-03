<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'employee_id')) {
                $table->string('employee_id')->nullable()->unique()->after('name');
            }
            if (! Schema::hasColumn('users', 'role')) {
                $table->string('role')->nullable()->after('employee_id');
            }
            if (! Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(false)->after('role');
            }
            if (! Schema::hasColumn('users', 'activated_at')) {
                $table->timestamp('activated_at')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('users', 'profile_photo_path')) {
                $table->string('profile_photo_path')->nullable()->after('activated_at');
            }
            if (! Schema::hasColumn('users', 'is_disabled')) {
                $table->boolean('is_disabled')->default(false)->after('profile_photo_path');
            }
            if (! Schema::hasColumn('users', 'password')) {
                $table->string('password')->nullable()->change();
            }
        });

        Schema::create('account_activation_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_activation_tokens');

        Schema::table('users', function (Blueprint $table) {
            $columns = [];
            foreach (['employee_id', 'role', 'is_active', 'activated_at', 'profile_photo_path', 'is_disabled'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $columns[] = $column;
                }
            }
            if ($columns) {
                $table->dropColumn($columns);
            }
        });
    }
};
