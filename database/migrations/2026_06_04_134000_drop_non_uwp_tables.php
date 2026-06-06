<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private array $tables = [
        'accomplishment_submission_mpor',
        'accomplishment_submissions',
        'development_plans',
        'functions',
        'integration_settings',
        'ipcr_items',
        'ipcrs',
        'mpors',
        'my_tasks',
        'opcr_unit_work_plan',
        'opcrs',
        'ors_entries',
        'ors_entry_evidences',
        'ors_entry_monitorings',
        'qar_headers',
        'qar_mpor_links',
        'qar_rows',
        'smpor_items',
        'smpors',
        'top_performers',
    ];

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ($this->tables as $table) {
            Schema::dropIfExists($table);
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    public function down(): void
    {
        // Intentionally empty — these tables are not needed
    }
};
