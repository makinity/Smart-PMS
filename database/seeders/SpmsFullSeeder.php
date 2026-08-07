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
 * Seeds a complete SPMS process flow for HRMO only.
 *
 * CBO is intentionally left untouched — it serves as the clean
 * negative test environment (no UWP, no MPORs, QAR blocked by rules).
 *
 * HRMO flow seeded:
 *  - UWP → approved + locked
 *  - OPCR → approved, linked to UWP
 *  - Indicator assignments → all HRMO employees on all indicators
 *  - IPCRs → committed, one per HRMO employee
 *  - IpcrItems → all indicators per employee
 *  - ORS entries → Jan–May (June intentionally empty for rule testing)
 *  - MPORs → Jan–May approved (June missing for rule testing)
 *  - QAR Q1 (Jan–Mar) → submitted to PMT with MPOR links + rows
 *    QAR Q2 (Apr–Jun) → NOT seeded (June MPOR missing blocks it)
 */
class SpmsFullSeeder extends Seeder
{
    public function run(): void
    {
        $hrmo = Office::where('code', 'HRMO')->firstOrFail();
        $period = PerformancePeriod::where('name', 'Jan-Jun 2026')->firstOrFail();

        $supervisor = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))->where('role', 'supervisor')->firstOrFail();
        $deptHead   = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))->where('role', 'dept-head')->firstOrFail();
        $pmt        = User::where('role', 'pmt')->firstOrFail();

        // All HRMO employees (excludes dept-head and supervisor)
        $employees = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'employee')
            ->get();

        // ── 1. Progress UWP to approved + locked ─────────────────────────
        $uwp = UnitWorkPlan::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        $uwp->update([
            'status'       => 'approved',
            'submitted_at' => Carbon::parse('2026-01-05 08:00:00'),
            'endorsed_at'  => Carbon::parse('2026-01-07 09:00:00'),
            'approved_at'  => Carbon::parse('2026-01-09 10:00:00'),
            'locked_at'    => Carbon::parse('2026-01-09 10:00:00'),
            'ratee_name'   => $hrmo->name,
            'period_covered' => 'January – June 2026',
        ]);

        $this->command->info('UWP progressed to approved + locked.');

        // ── 2. Create OPCR linked to UWP ─────────────────────────────────────
        $opcr = Opcr::firstOrCreate(
            ['office_id' => $hrmo->id, 'performance_period_id' => $period->id],
            ['status' => 'approved']
        );

        // Ensure pivot link exists
        if (! $opcr->uwps()->where('unit_work_plans.id', $uwp->id)->exists()) {
            $opcr->uwps()->attach($uwp->id);
        }

        $this->command->info('OPCR created/linked.');

        // ── 3. Assign all indicators to all HRMO employees ───────────────────
        $indicators = DB::table('uwp_success_indicators')
            ->join('uwp_mfos', 'uwp_mfos.id', '=', 'uwp_success_indicators.uwp_mfo_id')
            ->join('uwp_functions', 'uwp_functions.id', '=', 'uwp_mfos.uwp_function_id')
            ->where('uwp_functions.unit_work_plan_id', $uwp->id)
            ->select('uwp_success_indicators.id as si_id', 'uwp_functions.id as fn_id', 'uwp_mfos.title as mfo_title')
            ->get();

        foreach ($indicators as $si) {
            foreach ($employees as $emp) {
                UwpIndicatorAssignment::firstOrCreate(
                    ['uwp_success_indicator_id' => $si->si_id, 'employee_id' => $emp->id],
                    ['assigned_by' => $supervisor->id, 'assigned_at' => Carbon::parse('2026-01-09 10:30:00')]
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
                    'committed_at' => Carbon::parse('2026-01-10 08:00:00'),
                ]
            );

            // Wipe and re-seed items so re-runs are safe
            IpcrItem::where('ipcr_id', $ipcr->id)->delete();

            foreach ($indicators as $si) {
                // Resolve mfo_title and uwp_function_id from the UWP
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
                    'indicator_text'           => DB::table('uwp_success_indicators')->where('id', $si->si_id)->value('indicator_text') ?? '',
                ]);
            }
        }

        $this->command->info('IPCRs + IpcrItems committed for all HRMO employees.');

        // ── 5. ORS entries Jan–May (June empty) ──────────────────────────────
        // 3 entries per employee per month, spread across the month
        $months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
        $days   = [5, 12, 20]; // 3 entries per month

        // Remove any existing ORS data for these employees in this period
        $empIds = $employees->pluck('id')->toArray();
        DB::table('ors_entry_monitorings')
            ->whereIn('ors_entry_id', DB::table('ors_entries')->whereIn('employee_id', $empIds)->pluck('id'))
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
                    // Rotate through ipcr items so each entry uses a different one
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

        $this->command->info('ORS entries seeded for Jan–May (June empty).');

        // ── 6. MPORs Jan–May (approved, June missing) ────────────────────────
        Mpor::whereIn('employee_id', $empIds)
            ->whereIn('month', array_merge($months, ['2026-06']))
            ->delete();

        foreach ($employees as $emp) {
            foreach ($months as $month) {
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

        $this->command->info('MPORs seeded Jan–May (June intentionally missing).');

        // ── June MPORs — all HRMO employees except Carlos Mendoza ────────────
        // Carlos Mendoza is left out intentionally for rule testing
        $juneEmployees = $employees->filter(fn($e) => $e->email !== 'employee2@pms.test');

        foreach ($juneEmployees as $emp) {
            // Seed 3 ORS entries for June
            $ipcr = Ipcr::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();
            $ipcrItems = IpcrItem::where('ipcr_id', $ipcr->id)->get();

            foreach ([5, 12, 20] as $day) {
                $item = $ipcrItems->get(($day + $emp->id) % $ipcrItems->count());
                $entryId = DB::table('ors_entries')->insertGetId([
                    'employee_id'           => $emp->id,
                    'supervisor_id'         => $supervisor->id,
                    'performance_period_id' => $period->id,
                    'ipcr_id'               => $ipcr->id,
                    'ipcr_item_id'          => $item->id,
                    'work_date'             => "2026-06-{$day}",
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
                'month'        => '2026-06',
                'status'       => 'approved',
                'generated_at' => Carbon::parse('2026-06-28'),
                'submitted_at' => Carbon::parse('2026-06-29'),
                'approved_by'  => $supervisor->id,
                'approved_at'  => Carbon::parse('2026-06-30'),
                'created_by'   => $emp->id,
            ]);
        }

        $this->command->info('June MPORs seeded for all HRMO employees except Carlos Mendoza (employee2@pms.test).');

        // ── 7. QAR Q1 (Jan–Mar) — submitted to PMT ───────────────────────────
        // Q2 intentionally not seeded (June MPOR missing blocks it)
        $q1Key = $period->start_date->year . '-Q1';

        // Clean up previous QAR data for HRMO
        $existingQarIds = QarHeader::where('office_id', $hrmo->id)->pluck('id');
        QarMporLink::whereIn('qar_header_id', $existingQarIds)->delete();
        QarRow::whereIn('qar_header_id', $existingQarIds)->delete();
        QarHeader::where('office_id', $hrmo->id)->delete();

        $qarHeader = QarHeader::create([
            'office_id'              => $hrmo->id,
            'performance_period_id'  => $period->id,
            'quarter_key'            => $q1Key,
            'status'                 => 'submitted',
            'generated_at'           => Carbon::parse('2026-04-05 09:00:00'),
            'generated_by'           => $deptHead->id,
            'approved_at'            => Carbon::parse('2026-04-05 09:00:00'),
            'approved_by'            => $deptHead->id,
            'pmt_status'             => 'pending',
        ]);

        // Link all Jan–Mar MPORs to this QAR
        $q1Months = ['2026-01', '2026-02', '2026-03'];
        $q1Mpors  = Mpor::whereIn('employee_id', $empIds)
            ->whereIn('month', $q1Months)
            ->get();

        foreach ($q1Mpors as $mpor) {
            QarMporLink::create([
                'qar_header_id' => $qarHeader->id,
                'mpor_id'       => $mpor->id,
                'employee_name' => $mpor->employee?->name,
                'month_label'   => Carbon::parse($mpor->month . '-01')->format('F Y'),
                'status_label'  => 'Approved',
            ]);
        }

        // Build QAR rows from actual Q1 ORS data — group by ipcr_item
        $q1OrsEntries = DB::table('ors_entries')
            ->join('ors_entry_monitorings', 'ors_entries.id', '=', 'ors_entry_monitorings.ors_entry_id')
            ->join('ipcr_items', 'ors_entries.ipcr_item_id', '=', 'ipcr_items.id')
            ->join('uwp_success_indicators', 'ipcr_items.uwp_success_indicator_id', '=', 'uwp_success_indicators.id')
            ->whereIn('ors_entries.employee_id', $empIds)
            ->whereBetween('ors_entries.work_date', ['2026-01-01', '2026-03-31'])
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
            ->groupBy('ipcr_items.id', 'ipcr_items.output_title', 'ipcr_items.indicator_text', 'uwp_success_indicators.target_quantity', 'uwp_success_indicators.target_timeline')
            ->get();

        $sort = 0;
        foreach ($q1OrsEntries as $row) {
            QarRow::create([
                'qar_header_id'      => $qarHeader->id,
                'ppa_code'           => (string) $row->item_id,
                'mfo_title'          => $row->mfo_title,
                'indicator_text'     => $row->indicator_text,
                'target_quantity'    => $row->target_quantity,
                'target_timeline'    => $row->target_timeline,
                'actual_performance' => $row->actual_performance,
                'variance'           => $row->target_quantity ? ($row->actual_performance - $row->target_quantity) : null,
                'remarks'            => 'Auto-consolidated from Q1 MPORs',
                'sort_order'         => $sort++,
            ]);
        }

        $this->command->info("QAR Q1 seeded (submitted) with {$q1Mpors->count()} MPOR links and {$sort} rows.");
        $this->command->info('QAR Q2 intentionally NOT seeded — June MPOR missing blocks it.');
        $this->command->info('SpmsFullSeeder complete. CBO left untouched for negative rule testing.');
    }
}
