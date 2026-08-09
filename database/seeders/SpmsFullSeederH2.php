<?php

namespace Database\Seeders;

use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Mpor;
use App\Models\Office;
use App\Models\Opcr;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use App\Models\QarRow;
use App\Models\UnitWorkPlan;
use App\Models\UwpIndicatorAssignment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds a complete SPMS process flow for HRMO — Jul-Dec 2026.
 *
 * Mirrors SpmsFullSeeder exactly, shifted to the second half of 2026.
 * CBO is intentionally left untouched.
 *
 * HRMO flow seeded:
 *  - UWP → pmt_approved + locked
 *  - OPCR → approved, linked to UWP
 *  - Indicator assignments → all HRMO employees on all indicators
 *  - IPCRs → committed, one per HRMO employee
 *  - IpcrItems → all indicators per employee
 *  - ORS entries → Jul–Nov (December intentionally empty for rule testing)
 *  - MPORs → Jul–Nov approved (December missing for rule testing)
 *    Nov MPORs — all HRMO employees except Carlos Mendoza (employee2@pms.test)
 *  - QAR Q3 (Jul–Sep) → submitted to PMT with MPOR links + rows
 *    QAR Q4 (Oct–Dec) → NOT seeded (December MPOR missing blocks it)
 */
class SpmsFullSeederH2 extends Seeder
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

        // All HRMO employees (excludes dept-head and supervisor)
        $employees = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'employee')
            ->get();

        // ── 1. Progress UWP to approved + locked ─────────────────────────
        $uwp = UnitWorkPlan::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        $uwp->update([
            'status'         => 'approved',
            'submitted_at'   => Carbon::parse('2026-07-05 08:00:00'),
            'endorsed_at'    => Carbon::parse('2026-07-07 09:00:00'),
            'approved_at'    => Carbon::parse('2026-07-09 10:00:00'),
            'locked_at'      => Carbon::parse('2026-07-09 10:00:00'),
            'ratee_name'     => $hrmo->name,
            'period_covered' => 'July – December 2026',
        ]);

        $this->command->info('UWP progressed to approved + locked.');

        // ── 2. Create OPCR linked to UWP ─────────────────────────────────────
        $opcr = Opcr::firstOrCreate(
            ['office_id' => $hrmo->id, 'performance_period_id' => $period->id],
            ['status' => 'approved']
        );

        if (! $opcr->uwps()->where('unit_work_plans.id', $uwp->id)->exists()) {
            $opcr->uwps()->attach($uwp->id);
        }

        $this->command->info('OPCR created/linked.');

        // ── 3. Assign all indicators to all HRMO employees ───────────────────
        $indicators = DB::table('uwp_success_indicators')
            ->join('uwp_mfos', 'uwp_mfos.id', '=', 'uwp_success_indicators.uwp_mfo_id')
            ->join('uwp_functions', 'uwp_functions.id', '=', 'uwp_mfos.uwp_function_id')
            ->where('uwp_functions.unit_work_plan_id', $uwp->id)
            ->select(
                'uwp_success_indicators.id as si_id',
                'uwp_functions.id as fn_id',
                'uwp_mfos.title as mfo_title'
            )
            ->get();

        foreach ($indicators as $si) {
            foreach ($employees as $emp) {
                UwpIndicatorAssignment::firstOrCreate(
                    ['uwp_success_indicator_id' => $si->si_id, 'employee_id' => $emp->id],
                    [
                        'assigned_by' => $supervisor->id,
                        'assigned_at' => Carbon::parse('2026-07-09 10:30:00'),
                    ]
                );
            }
        }

        $this->command->info("Assigned {$indicators->count()} indicators × {$employees->count()} employees.");

        // ── 4. Create committed IPCRs + IpcrItems per employee ───────────────
        foreach ($employees as $emp) {
            $ipcr = Ipcr::updateOrCreate(
                ['employee_id' => $emp->id, 'performance_period_id' => $period->id],
                [
                    'opcr_id'      => $opcr->id,
                    'status'       => 'committed',
                    'committed_at' => Carbon::parse('2026-07-10 08:00:00'),
                ]
            );

            IpcrItem::where('ipcr_id', $ipcr->id)->delete();

            foreach ($indicators as $si) {
                $mfo = DB::table('uwp_mfos')
                    ->join('uwp_success_indicators', 'uwp_success_indicators.uwp_mfo_id', '=', 'uwp_mfos.id')
                    ->where('uwp_success_indicators.id', $si->si_id)
                    ->select('uwp_mfos.id as mfo_id', 'uwp_mfos.title')
                    ->first();

                IpcrItem::create([
                    'ipcr_id'                  => $ipcr->id,
                    'uwp_success_indicator_id' => $si->si_id,
                    'uwp_function_id'          => $si->fn_id,
                    'output_title'             => $mfo?->title ?? '',
                    'indicator_text'           => DB::table('uwp_success_indicators')
                        ->where('id', $si->si_id)
                        ->value('indicator_text') ?? '',
                ]);
            }
        }

        $this->command->info('IPCRs + IpcrItems committed for all HRMO employees.');

        // ── 5. ORS entries Jul–Nov (December empty) ──────────────────────────
        $months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
        $days   = [5, 12, 20];

        $empIds = $employees->pluck('id')->toArray();

        // Remove existing H2 ORS data for these employees
        DB::table('ors_entry_monitorings')
            ->whereIn('ors_entry_id', DB::table('ors_entries')
                ->whereIn('employee_id', $empIds)
                ->where('performance_period_id', $period->id)
                ->pluck('id'))
            ->delete();
        DB::table('ors_entries')
            ->whereIn('employee_id', $empIds)
            ->where('performance_period_id', $period->id)
            ->delete();

        foreach ($employees as $emp) {
            $ipcr = Ipcr::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();

            $ipcrItems = IpcrItem::where('ipcr_id', $ipcr->id)->get();

            foreach ($months as $month) {
                foreach ($days as $day) {
                    $item = $ipcrItems->get(($day + $emp->id) % $ipcrItems->count());

                    $entryId = DB::table('ors_entries')->insertGetId([
                        'employee_id'           => $emp->id,
                        'supervisor_id'         => $supervisor->id,
                        'performance_period_id' => $period->id,
                        'ipcr_id'               => $ipcr->id,
                        'ipcr_item_id'          => $item->id,
                        'work_date'             => "{$month}-{$day}",
                        'quantity'              => rand(2, 5),
                        'notes'                 => null,
                        'status'                => 'rated',
                        'total_seconds'         => rand(3600, 14400),
                        'submitted_at'          => Carbon::parse("{$month}-{$day}")->addDays(1),
                        'locked_at'             => Carbon::parse("{$month}-{$day}")->addDays(1),
                        'created_at'            => now(),
                        'updated_at'            => now(),
                    ]);

                    DB::table('ors_entry_monitorings')->insert([
                        'ors_entry_id'      => $entryId,
                        'supervisor_id'     => $supervisor->id,
                        'quality_rating'    => rand(3, 5),
                        'timeliness_rating' => rand(3, 5),
                        'remarks'           => null,
                        'rated_at'          => Carbon::parse("{$month}-{$day}")->addDays(2),
                        'created_at'        => now(),
                        'updated_at'        => now(),
                    ]);
                }
            }
        }

        $this->command->info('ORS entries seeded for Jul–Nov (December empty).');

        // ── 6. MPORs Jul–Oct approved, November missing then seeded partially ─
        // Jul–Oct: all employees
        $earlyMonths = ['2026-07', '2026-08', '2026-09', '2026-10'];

        Mpor::whereIn('employee_id', $empIds)
            ->whereIn('month', array_merge($earlyMonths, ['2026-11', '2026-12']))
            ->delete();

        foreach ($employees as $emp) {
            foreach ($earlyMonths as $month) {
                $monthEnd = Carbon::parse($month . '-28');
                Mpor::create([
                    'employee_id'  => $emp->id,
                    'office_id'    => $hrmo->id,
                    'month'        => $month,
                    'status'       => 'approved',
                    'generated_at' => $monthEnd->copy()->subDays(2),
                    'submitted_at' => $monthEnd->copy()->subDay(),
                    'approved_by'  => $supervisor->id,
                    'approved_at'  => $monthEnd,
                    'created_by'   => $emp->id,
                ]);
            }
        }

        $this->command->info('MPORs seeded Jul–Oct (all employees).');

        // ── November MPORs — all HRMO employees except Carlos Mendoza ────────
        // Carlos Mendoza (employee2@pms.test) is left out intentionally for rule testing
        $novEmployees = $employees->filter(fn ($e) => $e->email !== 'employee2@pms.test');

        foreach ($novEmployees as $emp) {
            // Seed 3 ORS entries for November for completeness
            $ipcr      = Ipcr::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();
            $ipcrItems = IpcrItem::where('ipcr_id', $ipcr->id)->get();

            foreach ([5, 12, 20] as $day) {
                $item    = $ipcrItems->get(($day + $emp->id) % $ipcrItems->count());
                $entryId = DB::table('ors_entries')->insertGetId([
                    'employee_id'           => $emp->id,
                    'supervisor_id'         => $supervisor->id,
                    'performance_period_id' => $period->id,
                    'ipcr_id'               => $ipcr->id,
                    'ipcr_item_id'          => $item->id,
                    'work_date'             => "2026-11-{$day}",
                    'quantity'              => rand(2, 5),
                    'notes'                 => null,
                    'status'                => 'rated',
                    'total_seconds'         => rand(3600, 14400),
                    'submitted_at'          => now(),
                    'locked_at'             => now(),
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);

                DB::table('ors_entry_monitorings')->insert([
                    'ors_entry_id'      => $entryId,
                    'supervisor_id'     => $supervisor->id,
                    'quality_rating'    => rand(3, 5),
                    'timeliness_rating' => rand(3, 5),
                    'remarks'           => null,
                    'rated_at'          => now(),
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            Mpor::create([
                'employee_id'  => $emp->id,
                'office_id'    => $hrmo->id,
                'month'        => '2026-11',
                'status'       => 'approved',
                'generated_at' => Carbon::parse('2026-11-28'),
                'submitted_at' => Carbon::parse('2026-11-29'),
                'approved_by'  => $supervisor->id,
                'approved_at'  => Carbon::parse('2026-11-30'),
                'created_by'   => $emp->id,
            ]);
        }

        $this->command->info('November MPORs seeded for all HRMO employees except Carlos Mendoza (employee2@pms.test).');
        $this->command->info('December ORS + MPOR intentionally NOT seeded — mirrors H1 rule-testing pattern.');

        // ── 7. QAR Q3 (Jul–Sep) — submitted to PMT ───────────────────────────
        // Q4 intentionally not seeded (December MPOR missing blocks it)
        $q3Key = $period->start_date->year . '-Q1';

        // Clean up previous QAR data for HRMO in this period
        $existingQarIds = QarHeader::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->pluck('id');
        QarMporLink::whereIn('qar_header_id', $existingQarIds)->delete();
        QarRow::whereIn('qar_header_id', $existingQarIds)->delete();
        QarHeader::whereIn('id', $existingQarIds)->delete();

        $qarHeader = QarHeader::create([
            'office_id'             => $hrmo->id,
            'performance_period_id' => $period->id,
            'quarter_key'           => $q3Key,
            'status'                => 'submitted',
            'generated_at'          => Carbon::parse('2026-10-05 09:00:00'),
            'generated_by'          => $deptHead->id,
            'approved_at'           => Carbon::parse('2026-10-05 09:00:00'),
            'approved_by'           => $deptHead->id,
            'pmt_status'            => 'pending',
        ]);

        // Link all Jul–Sep MPORs to this QAR
        $q3Months = ['2026-07', '2026-08', '2026-09'];
        $q3Mpors  = Mpor::whereIn('employee_id', $empIds)
            ->whereIn('month', $q3Months)
            ->get();

        foreach ($q3Mpors as $mpor) {
            QarMporLink::create([
                'qar_header_id' => $qarHeader->id,
                'mpor_id'       => $mpor->id,
                'employee_name' => $mpor->employee?->name,
                'month_label'   => Carbon::parse($mpor->month . '-01')->format('F Y'),
                'status_label'  => 'Approved',
            ]);
        }

        // Build QAR rows from actual Q3 ORS data — group by ipcr_item
        $q3OrsEntries = DB::table('ors_entries')
            ->join('ors_entry_monitorings', 'ors_entries.id', '=', 'ors_entry_monitorings.ors_entry_id')
            ->join('ipcr_items', 'ors_entries.ipcr_item_id', '=', 'ipcr_items.id')
            ->join('uwp_success_indicators', 'ipcr_items.uwp_success_indicator_id', '=', 'uwp_success_indicators.id')
            ->whereIn('ors_entries.employee_id', $empIds)
            ->whereBetween('ors_entries.work_date', ['2026-07-01', '2026-09-30'])
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
        foreach ($q3OrsEntries as $row) {
            QarRow::create([
                'qar_header_id'      => $qarHeader->id,
                'ppa_code'           => (string) $row->item_id,
                'mfo_title'          => $row->mfo_title,
                'indicator_text'     => $row->indicator_text,
                'target_quantity'    => $row->target_quantity,
                'target_timeline'    => $row->target_timeline,
                'actual_performance' => $row->actual_performance,
                'variance'           => $row->target_quantity
                    ? ($row->actual_performance - $row->target_quantity)
                    : null,
                'remarks'            => 'Auto-consolidated from Q3 MPORs',
                'sort_order'         => $sort++,
            ]);
        }

        $this->command->info("QAR Q3 seeded (submitted) with {$q3Mpors->count()} MPOR links and {$sort} rows.");
        $this->command->info('QAR Q4 intentionally NOT seeded — December MPOR missing blocks it.');
        $this->command->info('SpmsFullSeederH2 complete. CBO left untouched for negative rule testing.');
    }
}
