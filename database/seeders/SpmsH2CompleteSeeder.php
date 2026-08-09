<?php

namespace Database\Seeders;

use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Mpor;
use App\Models\Office;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use App\Models\QarRow;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Completes the Jul-Dec 2026 HRMO flow so it mirrors the H1 pattern.
 *
 * SpmsFullSeederH2 intentionally left:
 *   - December ORS entries missing for ALL employees
 *   - December MPORs missing for ALL employees
 *   - QAR Q4 (Oct–Dec) not seeded
 *   - QAR Q3 (Jul–Sep) only submitted (not yet pmt_approved)
 *   - November MPORs missing for Carlos Mendoza only
 *
 * After this seeder runs:
 *   - All employees EXCEPT Mark Juntilla (denjikun1004@gmail.com):
 *       → December ORS entries (3 days, rated + monitored)
 *       → December MPOR → approved by supervisor
 *   - Mark Juntilla: NO December ORS, NO December MPOR (testing account)
 *   - Carlos Mendoza: November MPOR + ORS backfilled (was intentionally excluded)
 *   - QAR Q3 (Jul–Sep) → upgraded to pmt_approved
 *   - QAR Q4 (Oct–Dec) → draft (status=draft, pmt_status=pending)
 *     Links all Oct–Dec MPORs for employees who have them (excludes Mark Juntilla's Dec)
 *     Months covered shows 2/3 since Mark Juntilla hasn't submitted December MPOR
 *     Dept-head can review and submit to PMT when ready
 */
class SpmsH2CompleteSeeder extends Seeder
{
    public function run(): void
    {
        $hrmo   = Office::where('code', 'HRMO')->firstOrFail();
        $period = PerformancePeriod::where('name', 'Jul-Dec 2026')->firstOrFail();

        $supervisor = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'supervisor')
            ->firstOrFail();

        $deptHead = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'dept-head')
            ->firstOrFail();

        // All HRMO employees (role = employee)
        $employees = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'employee')
            ->get();

        $empIds = $employees->pluck('id')->toArray();

        // Mark Juntilla — excluded from December seeding
        $markEmail = 'denjikun1004@gmail.com';

        // Employees who get December data (everyone except Mark)
        $decEmployees = $employees->filter(fn ($e) => $e->email !== $markEmail);

        // ── 1. Backfill November for Carlos Mendoza ───────────────────────────
        // SpmsFullSeederH2 excluded him from November. Fill it now.
        $carlos = $employees->firstWhere('email', 'employee2@pms.test');

        if ($carlos) {
            $carlosIpcr  = Ipcr::where('employee_id', $carlos->id)
                ->where('performance_period_id', $period->id)
                ->first();
            $carlosItems = IpcrItem::where('ipcr_id', $carlosIpcr->id)->get();

            foreach ([5, 12, 20] as $day) {
                $exists = DB::table('ors_entries')
                    ->where('employee_id', $carlos->id)
                    ->where('work_date', "2026-11-{$day}")
                    ->exists();

                if ($exists) continue;

                $item    = $carlosItems->get(($day + $carlos->id) % $carlosItems->count());
                $entryId = DB::table('ors_entries')->insertGetId([
                    'employee_id'           => $carlos->id,
                    'supervisor_id'         => $supervisor->id,
                    'performance_period_id' => $period->id,
                    'ipcr_id'               => $carlosIpcr->id,
                    'ipcr_item_id'          => $item->id,
                    'work_date'             => "2026-11-{$day}",
                    'quantity'              => rand(2, 4),
                    'notes'                 => null,
                    'status'                => 'rated',
                    'total_seconds'         => rand(3600, 14400),
                    'submitted_at'          => Carbon::parse("2026-11-{$day}")->addDay(),
                    'locked_at'             => Carbon::parse("2026-11-{$day}")->addDay(),
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);

                DB::table('ors_entry_monitorings')->insert([
                    'ors_entry_id'      => $entryId,
                    'supervisor_id'     => $supervisor->id,
                    'quality_rating'    => rand(3, 4),
                    'timeliness_rating' => rand(3, 4),
                    'remarks'           => null,
                    'rated_at'          => Carbon::parse("2026-11-{$day}")->addDays(2),
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            Mpor::firstOrCreate(
                ['employee_id' => $carlos->id, 'month' => '2026-11'],
                [
                    'office_id'    => $hrmo->id,
                    'status'       => 'approved',
                    'generated_at' => Carbon::parse('2026-11-28'),
                    'submitted_at' => Carbon::parse('2026-11-29'),
                    'approved_by'  => $supervisor->id,
                    'approved_at'  => Carbon::parse('2026-11-30'),
                    'created_by'   => $carlos->id,
                ]
            );

            $this->command->info('November ORS + MPOR backfilled for Carlos Mendoza.');
        }

        // ── 2. December ORS + MPOR for all employees except Mark Juntilla ─────
        foreach ($decEmployees as $emp) {
            $ipcr      = Ipcr::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();
            $ipcrItems = IpcrItem::where('ipcr_id', $ipcr->id)->get();

            foreach ([5, 12, 20] as $day) {
                $exists = DB::table('ors_entries')
                    ->where('employee_id', $emp->id)
                    ->where('work_date', "2026-12-{$day}")
                    ->exists();

                if ($exists) continue;

                $item    = $ipcrItems->get(($day + $emp->id) % $ipcrItems->count());
                $entryId = DB::table('ors_entries')->insertGetId([
                    'employee_id'           => $emp->id,
                    'supervisor_id'         => $supervisor->id,
                    'performance_period_id' => $period->id,
                    'ipcr_id'               => $ipcr->id,
                    'ipcr_item_id'          => $item->id,
                    'work_date'             => "2026-12-{$day}",
                    'quantity'              => rand(2, 5),
                    'notes'                 => null,
                    'status'                => 'rated',
                    'total_seconds'         => rand(3600, 14400),
                    'submitted_at'          => Carbon::parse("2026-12-{$day}")->addDay(),
                    'locked_at'             => Carbon::parse("2026-12-{$day}")->addDay(),
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);

                DB::table('ors_entry_monitorings')->insert([
                    'ors_entry_id'      => $entryId,
                    'supervisor_id'     => $supervisor->id,
                    'quality_rating'    => rand(3, 5),
                    'timeliness_rating' => rand(3, 5),
                    'remarks'           => null,
                    'rated_at'          => Carbon::parse("2026-12-{$day}")->addDays(2),
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            Mpor::firstOrCreate(
                ['employee_id' => $emp->id, 'month' => '2026-12'],
                [
                    'office_id'    => $hrmo->id,
                    'status'       => 'approved',
                    'generated_at' => Carbon::parse('2026-12-28'),
                    'submitted_at' => Carbon::parse('2026-12-29'),
                    'approved_by'  => $supervisor->id,
                    'approved_at'  => Carbon::parse('2026-12-30'),
                    'created_by'   => $emp->id,
                ]
            );
        }

        $this->command->info("December ORS + MPOR seeded for {$decEmployees->count()} employees (Mark Juntilla excluded).");

        // ── 3. Upgrade QAR Q3 to pmt_approved ────────────────────────────────
        $q3Key    = $period->start_date->year . '-Q1';
        $qarQ3    = QarHeader::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->where('quarter_key', $q3Key)
            ->first();

        if ($qarQ3 && $qarQ3->pmt_status !== 'validated') {
            $qarQ3->update([
                'status'           => 'pmt_approved',
                'pmt_status'       => 'validated',
                'pmt_validated_at' => Carbon::parse('2026-10-15 10:00:00'),
                'pmt_validated_by' => User::where('role', 'pmt')->value('id'),
            ]);
            $this->command->info('QAR Q3 upgraded to pmt_approved.');
        } elseif ($qarQ3) {
            $this->command->info('QAR Q3 already pmt_approved — skipped.');
        } else {
            $this->command->warn('QAR Q3 not found — skipped.');
        }

        // ── 4. QAR Q4 (Oct–Dec) — submitted to dept-head ─────────────────────
        $q4Key = $period->start_date->year . '-Q2';

        $existingQ4 = QarHeader::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->where('quarter_key', $q4Key)
            ->first();

        if ($existingQ4) {
            // Fix existing QAR Q4 — reset to draft so dept-head can review and submit
            $existingQ4->update([
                'status'     => 'draft',
                'pmt_status' => 'pending',
            ]);
            $qarQ4 = $existingQ4;
            $this->command->info('QAR Q4 already exists — status reset to draft.');
        } else {
            $qarQ4 = QarHeader::create([
                'office_id'             => $hrmo->id,
                'performance_period_id' => $period->id,
                'quarter_key'           => $q4Key,
                'status'                => 'draft',   // Draft — Mark Juntilla Dec MPOR missing, dept-head reviews before submit
                'generated_at'          => Carbon::parse('2027-01-05 09:00:00'),
                'generated_by'          => $deptHead->id,
                'approved_at'           => null,
                'approved_by'           => null,
                'pmt_status'            => 'pending',
            ]);

            // Link all Oct–Dec MPORs that exist (excludes Mark's missing December)
            $q4Months = ['2026-10', '2026-11', '2026-12'];
            $q4Mpors  = Mpor::whereIn('employee_id', $empIds)
                ->whereIn('month', $q4Months)
                ->where('status', 'approved')
                ->get();

            foreach ($q4Mpors as $mpor) {
                QarMporLink::firstOrCreate(
                    ['qar_header_id' => $qarQ4->id, 'mpor_id' => $mpor->id],
                    [
                        'employee_name' => $mpor->employee?->name,
                        'month_label'   => Carbon::parse($mpor->month . '-01')->format('F Y'),
                        'status_label'  => 'Approved',
                    ]
                );
            }

            // Build QAR rows from Q4 ORS data (Oct 1 – Dec 31, excludes Mark's missing entries)
            $q4OrsEntries = DB::table('ors_entries')
                ->join('ors_entry_monitorings', 'ors_entries.id', '=', 'ors_entry_monitorings.ors_entry_id')
                ->join('ipcr_items', 'ors_entries.ipcr_item_id', '=', 'ipcr_items.id')
                ->join('uwp_success_indicators', 'ipcr_items.uwp_success_indicator_id', '=', 'uwp_success_indicators.id')
                ->whereIn('ors_entries.employee_id', $empIds)
                ->whereBetween('ors_entries.work_date', ['2026-10-01', '2026-12-31'])
                ->where('ors_entries.status', 'rated')
                ->where('ors_entries.quantity', '>', 0)
                ->whereNotNull('ors_entry_monitorings.quality_rating')
                ->select(
                    'ipcr_items.id as item_id',
                    'ipcr_items.output_title as mfo_title',
                    'ipcr_items.indicator_text',
                    'uwp_success_indicators.target_quantity',
                    'uwp_success_indicators.target_timeline',
                    DB::raw('SUM(ors_entries.quantity) as actual_performance')
                )
                ->groupBy(
                    'ipcr_items.id',
                    'ipcr_items.output_title',
                    'ipcr_items.indicator_text',
                    'uwp_success_indicators.target_quantity',
                    'uwp_success_indicators.target_timeline'
                )
                ->get();

            $sort = 0;
            foreach ($q4OrsEntries as $row) {
                QarRow::create([
                    'qar_header_id'      => $qarQ4->id,
                    'ppa_code'           => (string) $row->item_id,
                    'mfo_title'          => $row->mfo_title,
                    'indicator_text'     => $row->indicator_text,
                    'target_quantity'    => $row->target_quantity,
                    'target_timeline'    => $row->target_timeline,
                    'actual_performance' => $row->actual_performance,
                    'variance'           => $row->target_quantity
                        ? round($row->actual_performance - $row->target_quantity, 2)
                        : null,
                    'remarks'            => 'Auto-consolidated from Q4 MPORs',
                    'sort_order'         => $sort++,
                ]);
            }

            $this->command->info("QAR Q2 seeded (draft — Mark Juntilla Dec MPOR missing) with {$q4Mpors->count()} MPOR links and {$sort} rows.");
        }

        $this->command->info('SpmsH2CompleteSeeder done.');
        $this->command->info('Mark Juntilla has NO December ORS and NO December MPOR — ready for manual testing.');
    }
}
