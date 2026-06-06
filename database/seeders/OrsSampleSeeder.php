<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OrsSampleSeeder extends Seeder
{
    public function run(): void
    {
        // Carlos Mendoza (employee_id=6) has committed IPCR (id=2) with ipcr_items 9-16
        // Supervisor: Jose Reyes (id=4), Period: 1
        $employeeId  = DB::table('users')->where('email', 'employee2@pms.test')->value('id');
        $supervisorId = DB::table('users')->where('role', 'supervisor')
            ->whereRaw('office_id = (SELECT office_id FROM users WHERE email = ?)', ['employee2@pms.test'])
            ->value('id');
        $periodId = DB::table('performance_periods')->where('is_active', true)->value('id');
        $ipcrId   = DB::table('ipcrs')->where('employee_id', $employeeId)->where('status', 'committed')->value('id');

        if (! $employeeId || ! $supervisorId || ! $periodId || ! $ipcrId) return;

        // Get IPCR items for this employee grouped by function_type
        $items = DB::select(
            'SELECT ii.id as ipcr_item_id, f.function_type
             FROM ipcr_items ii
             JOIN uwp_success_indicators si ON ii.uwp_success_indicator_id = si.id
             JOIN uwp_mfos m ON si.uwp_mfo_id = m.id
             JOIN uwp_functions f ON m.uwp_function_id = f.id
             WHERE ii.ipcr_id = ?',
            [$ipcrId]
        );

        $coreItems    = array_values(array_filter($items, fn($i) => $i->function_type === 'core'));
        $supportItems = array_values(array_filter($items, fn($i) => $i->function_type === 'support'));

        $month  = now()->format('Y-m');
        $entries = [];

        // Core: 2 items × 4 weeks = 8 entries
        foreach (array_slice($coreItems, 0, 2) as $item) {
            foreach ([3, 8, 15, 22] as $day) {
                $entries[] = $this->entry($employeeId, $supervisorId, $periodId, $ipcrId, $item->ipcr_item_id, "{$month}-{$day}");
            }
        }

        // Support: 2 items × 3 weeks = 6 entries
        foreach (array_slice($supportItems, 0, 2) as $item) {
            foreach ([5, 12, 19] as $day) {
                $entries[] = $this->entry($employeeId, $supervisorId, $periodId, $ipcrId, $item->ipcr_item_id, "{$month}-{$day}");
            }
        }

        foreach ($entries as $e) {
            $existing = DB::table('ors_entries')
                ->where('employee_id', $employeeId)
                ->where('ipcr_item_id', $e['ipcr_item_id'])
                ->where('work_date', $e['work_date'])
                ->exists();

            if ($existing) continue;

            $entryId = DB::table('ors_entries')->insertGetId($e);

            // Add monitoring rating
            DB::table('ors_entry_monitorings')->insert([
                'ors_entry_id'     => $entryId,
                'supervisor_id'    => $supervisorId,
                'quality_rating'   => rand(4, 5),
                'timeliness_rating' => rand(4, 5),
                'remarks'          => null,
                'rated_at'         => now(),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }
    }

    private function entry(int $emp, int $sup, int $period, int $ipcr, int $ipcrItem, string $date): array
    {
        return [
            'employee_id'           => $emp,
            'supervisor_id'         => $sup,
            'performance_period_id' => $period,
            'ipcr_id'               => $ipcr,
            'ipcr_item_id'          => $ipcrItem,
            'work_date'             => $date,
            'quantity'              => rand(1, 5),
            'notes'                 => null,
            'status'                => 'rated',
            'total_seconds'         => rand(1800, 14400),
            'started_at'            => null,
            'stopped_at'            => null,
            'submitted_at'          => now()->subDays(rand(1, 5)),
            'locked_at'             => now()->subDays(rand(1, 5)),
            'created_at'            => now(),
            'updated_at'            => now(),
        ];
    }
}
