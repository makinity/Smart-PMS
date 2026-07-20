<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Option B: Separate employees table with accessor bridge.
 *
 * UP:
 *  1. Create employees table with all non-auth employee fields.
 *  2. Copy existing user rows into employees (preserving all data).
 *  3. Drop the employee columns from users.
 *
 * DOWN:
 *  1. Re-add the columns back to users.
 *  2. Copy data back from employees into users.
 *  3. Drop the employees table.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Create employees table ────────────────────────────────────────
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

            $table->string('employee_id')->nullable()->unique();
            $table->unsignedBigInteger('hms_employee_id')->nullable()->unique();
            $table->foreignId('office_id')->nullable()->constrained('offices')->nullOnDelete();
            $table->string('position')->nullable();

            $table->boolean('is_active')->default(false);
            $table->boolean('is_disabled')->default(false);
            $table->timestamp('activated_at')->nullable();
            $table->string('profile_photo_path')->nullable();

            $table->boolean('training_locked')->default(false);
            $table->string('lnd_reference_id')->nullable();

            $table->timestamps();
        });

        // ── 2. Copy data from users → employees ──────────────────────────────
        $users = DB::table('users')->get();
        $hasHmsId = Schema::hasColumn('users', 'hms_employee_id');

        foreach ($users as $user) {
            DB::table('employees')->insert([
                'user_id'            => $user->id,
                'employee_id'        => $user->employee_id ?? null,
                'hms_employee_id'    => $hasHmsId ? ($user->hms_employee_id ?? null) : null,
                'office_id'          => $user->office_id ?? null,
                'position'           => $user->position ?? null,
                'is_active'          => $user->is_active ?? false,
                'is_disabled'        => $user->is_disabled ?? false,
                'activated_at'       => $user->activated_at ?? null,
                'profile_photo_path' => $user->profile_photo_path ?? null,
                'training_locked'    => $user->training_locked ?? false,
                'lnd_reference_id'   => $user->lnd_reference_id ?? null,
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);
        }

        // ── 3. Drop employee columns from users ──────────────────────────────
        // Check if users.office_id has a FK constraint before trying to drop it
        $officeFk = collect(DB::select(
            "SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
             AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME LIKE '%office%'"
        ))->pluck('CONSTRAINT_NAME')->first();

        if ($officeFk) {
            Schema::table('users', function (Blueprint $table) use ($officeFk) {
                $table->dropForeign($officeFk);
            });
        }

        Schema::table('users', function (Blueprint $table) {
            // Only drop columns that actually exist
            $toDrop = collect([
                'employee_id', 'hms_employee_id', 'office_id', 'position',
                'is_active', 'is_disabled', 'activated_at', 'profile_photo_path',
                'training_locked', 'lnd_reference_id',
            ])->filter(fn ($col) => Schema::hasColumn('users', $col))->values()->all();

            if ($toDrop) {
                $table->dropColumn($toDrop);
            }
        });
    }

    public function down(): void
    {
        // ── 1. Re-add columns to users ───────────────────────────────────────
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id')->nullable()->unique()->after('name');
            $table->unsignedBigInteger('hms_employee_id')->nullable()->unique()->after('employee_id');
            $table->foreignId('office_id')->nullable()->constrained('offices')->nullOnDelete()->after('role');
            $table->string('position')->nullable()->after('office_id');
            $table->boolean('is_active')->default(false)->after('position');
            $table->boolean('is_disabled')->default(false)->after('is_active');
            $table->timestamp('activated_at')->nullable()->after('is_disabled');
            $table->string('profile_photo_path')->nullable()->after('activated_at');
            $table->boolean('training_locked')->default(false)->after('profile_photo_path');
            $table->string('lnd_reference_id')->nullable()->after('training_locked');
        });

        // ── 2. Copy data back from employees → users ─────────────────────────
        $employees = DB::table('employees')->get();

        foreach ($employees as $emp) {
            DB::table('users')->where('id', $emp->user_id)->update([
                'employee_id'        => $emp->employee_id,
                'hms_employee_id'    => $emp->hms_employee_id,
                'office_id'          => $emp->office_id,
                'position'           => $emp->position,
                'is_active'          => $emp->is_active,
                'is_disabled'        => $emp->is_disabled,
                'activated_at'       => $emp->activated_at,
                'profile_photo_path' => $emp->profile_photo_path,
                'training_locked'    => $emp->training_locked,
                'lnd_reference_id'   => $emp->lnd_reference_id,
            ]);
        }

        // ── 3. Drop employees table ───────────────────────────────────────────
        Schema::dropIfExists('employees');
    }
};
