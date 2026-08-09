<?php

namespace Database\Seeders;

use App\Models\AccomplishmentSubmission;
use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Mpor;
use App\Models\Office;
use App\Models\Opcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use App\Models\QarMporLink;
use App\Models\QarRow;
use App\Models\UnitWorkPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Completes the Jan-Jun 2026 performance period so it looks like a
 * fully closed-out historical record.
 *
 * What SpmsFullSeeder intentionally left incomplete:
 *   - Carlos Mendoza has no June ORS entries and no June MPOR
 *   - QAR Q2 (Apr–Jun) was not seeded
 *   - No AccomplishmentSubmissions (IPCR rating submissions)
 *   - No OpcraAccomplishmentSubmission (office-level OPCR rating)
 *   - No DevelopmentPlans (IDP)
 *   - IPCR status is still 'committed' (not 'released_by_pmt')
 *   - OPCR status is still 'approved' (not released)
 *
 * After this seeder runs, Jan-Jun 2026 will have:
 *   - All employees: June ORS entries + approved June MPOR
 *   - QAR Q2 submitted to PMT
 *   - AccomplishmentSubmission per employee → released_by_pmt + final rating
 *   - IPCR per employee → released_by_pmt + final_score
 *   - OpcraAccomplishmentSubmission → released (office rating)
 *   - DevelopmentPlan per employee → submitted_to_ld (IDP fully processed)
 */
class SpmsH1CompleteSeeder extends Seeder
{
    public function run(): void
    {
        $hrmo   = Office::where('code', 'HRMO')->firstOrFail();
        $period = PerformancePeriod::where('name', 'Jan-Jun 2026')->firstOrFail();

        $supervisor = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'supervisor')
            ->firstOrFail();

        $deptHead = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'dept-head')
            ->firstOrFail();

        $pmt = User::where('role', 'pmt')->firstOrFail();

        $employees = User::whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->where('role', 'employee')
            ->get();

        $empIds = $employees->pluck('id')->toArray();

        $uwp  = \App\Models\UnitWorkPlan::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        $opcr = Opcr::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->firstOrFail();

        // ── 1. Fill June ORS + MPOR for Carlos Mendoza ───────────────────────
        $carlos = $employees->firstWhere('email', 'employee2@pms.test');

        if ($carlos) {
            $carlosIpcr  = Ipcr::where('employee_id', $carlos->id)
                ->where('performance_period_id', $period->id)
                ->first();
            $carlosItems = IpcrItem::where('ipcr_id', $carlosIpcr->id)->get();

            foreach ([5, 12, 20] as $day) {
                $alreadyExists = DB::table('ors_entries')
                    ->where('employee_id', $carlos->id)
                    ->where('work_date', "2026-06-{$day}")
                    ->exists();

                if ($alreadyExists) continue;

                $item    = $carlosItems->get(($day + $carlos->id) % $carlosItems->count());
                $entryId = DB::table('ors_entries')->insertGetId([
                    'employee_id'           => $carlos->id,
                    'supervisor_id'         => $supervisor->id,
                    'performance_period_id' => $period->id,
                    'ipcr_id'               => $carlosIpcr->id,
                    'ipcr_item_id'          => $item->id,
                    'work_date'             => "2026-06-{$day}",
                    'quantity'              => rand(2, 4),
                    'notes'                 => null,
                    'status'                => 'rated',
                    'total_seconds'         => rand(3600, 14400),
                    'submitted_at'          => Carbon::parse("2026-06-{$day}")->addDay(),
                    'locked_at'             => Carbon::parse("2026-06-{$day}")->addDay(),
                    'created_at'            => now(),
                    'updated_at'            => now(),
                ]);

                DB::table('ors_entry_monitorings')->insert([
                    'ors_entry_id'      => $entryId,
                    'supervisor_id'     => $supervisor->id,
                    'quality_rating'    => rand(3, 4),
                    'timeliness_rating' => rand(3, 4),
                    'remarks'           => null,
                    'rated_at'          => Carbon::parse("2026-06-{$day}")->addDays(2),
                    'created_at'        => now(),
                    'updated_at'        => now(),
                ]);
            }

            Mpor::firstOrCreate(
                ['employee_id' => $carlos->id, 'month' => '2026-06'],
                [
                    'office_id'    => $hrmo->id,
                    'status'       => 'approved',
                    'generated_at' => Carbon::parse('2026-06-28'),
                    'submitted_at' => Carbon::parse('2026-06-29'),
                    'approved_by'  => $supervisor->id,
                    'approved_at'  => Carbon::parse('2026-06-30'),
                    'created_by'   => $carlos->id,
                ]
            );

            $this->command->info('June ORS + MPOR filled for Carlos Mendoza.');
        }

        // ── 2. QAR Q2 (Apr–Jun) — submitted to PMT ───────────────────────────
        $q2Key = $period->start_date->year . '-Q2';

        $existingQ2 = QarHeader::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->where('quarter_key', $q2Key)
            ->first();

        if (! $existingQ2) {
            $q2Header = QarHeader::create([
                'office_id'             => $hrmo->id,
                'performance_period_id' => $period->id,
                'quarter_key'           => $q2Key,
                'status'                => 'pmt_approved',
                'generated_at'          => Carbon::parse('2026-07-05 09:00:00'),
                'generated_by'          => $deptHead->id,
                'approved_at'           => Carbon::parse('2026-07-05 09:00:00'),
                'approved_by'           => $deptHead->id,
                'pmt_status'            => 'validated',
                'pmt_validated_at'      => Carbon::parse('2026-07-10 10:00:00'),
                'pmt_validated_by'      => $pmt->id,
            ]);

            $q2Months = ['2026-04', '2026-05', '2026-06'];
            $q2Mpors  = Mpor::whereIn('employee_id', $empIds)
                ->whereIn('month', $q2Months)
                ->get();

            foreach ($q2Mpors as $mpor) {
                QarMporLink::create([
                    'qar_header_id' => $q2Header->id,
                    'mpor_id'       => $mpor->id,
                    'employee_name' => $mpor->employee?->name,
                    'month_label'   => Carbon::parse($mpor->month . '-01')->format('F Y'),
                    'status_label'  => 'Approved',
                ]);
            }

            // Build QAR rows from Q2 ORS data
            $q2OrsEntries = DB::table('ors_entries')
                ->join('ors_entry_monitorings', 'ors_entries.id', '=', 'ors_entry_monitorings.ors_entry_id')
                ->join('ipcr_items', 'ors_entries.ipcr_item_id', '=', 'ipcr_items.id')
                ->join('uwp_success_indicators', 'ipcr_items.uwp_success_indicator_id', '=', 'uwp_success_indicators.id')
                ->whereIn('ors_entries.employee_id', $empIds)
                ->whereBetween('ors_entries.work_date', ['2026-04-01', '2026-06-30'])
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
            foreach ($q2OrsEntries as $row) {
                QarRow::create([
                    'qar_header_id'      => $q2Header->id,
                    'ppa_code'           => (string) $row->item_id,
                    'mfo_title'          => $row->mfo_title,
                    'indicator_text'     => $row->indicator_text,
                    'target_quantity'    => $row->target_quantity,
                    'target_timeline'    => $row->target_timeline,
                    'actual_performance' => $row->actual_performance,
                    'variance'           => $row->target_quantity
                        ? ($row->actual_performance - $row->target_quantity)
                        : null,
                    'remarks'            => 'Auto-consolidated from Q2 MPORs',
                    'sort_order'         => $sort++,
                ]);
            }

            $this->command->info("QAR Q2 seeded (pmt_approved) with {$q2Mpors->count()} MPOR links and {$sort} rows.");
        } else {
            // Ensure existing Q2 is also pmt_approved
            $existingQ2->update([
                'status'           => 'pmt_approved',
                'pmt_status'       => 'validated',
                'pmt_validated_at' => Carbon::parse('2026-07-10 10:00:00'),
                'pmt_validated_by' => $pmt->id,
            ]);
            $this->command->info('QAR Q2 already exists — upgraded to pmt_approved.');
        }

        // ── Also ensure Q1 is pmt_approved ───────────────────────────────────
        $q1Key = $period->start_date->year . '-Q1';
        $qarQ1 = QarHeader::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->where('quarter_key', $q1Key)
            ->first();
        if ($qarQ1 && $qarQ1->pmt_status !== 'validated') {
            $qarQ1->update([
                'status'           => 'pmt_approved',
                'pmt_status'       => 'validated',
                'pmt_validated_at' => Carbon::parse('2026-04-15 10:00:00'),
                'pmt_validated_by' => $pmt->id,
            ]);
            $this->command->info('QAR Q1 → pmt_approved.');
        }

        // ── 3. AccomplishmentSubmissions → released_by_pmt ───────────────────
        // Full flow: submitted_to_supervisor → supervisor_approved → dept_head_endorsed → released_by_pmt
        // Rating scale: >= 5.00 Outstanding, >= 4.00 Very Satisfactory, >= 3.00 Satisfactory,
        //               >= 2.00 Unsatisfactory, < 2.00 Poor
        // IDP eligibility: Unsatisfactory or Poor only (LOW_RATINGS in DevelopmentPlanningController)
        // employee1 + employee3 = good performers (no IDP)
        // employee2 + employee4 = Unsatisfactory (IDP required)
        $ratingMap = [
            'employee1@pms.test' => ['score' => 4.25, 'adjectival' => 'Very Satisfactory'],
            'employee2@pms.test' => ['score' => 2.50, 'adjectival' => 'Unsatisfactory'],
            'employee3@pms.test' => ['score' => 5.00, 'adjectival' => 'Outstanding'],
            'employee4@pms.test' => ['score' => 2.75, 'adjectival' => 'Unsatisfactory'],
        ];

        $q2Header = QarHeader::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->where('quarter_key', $q2Key)
            ->first();

        foreach ($employees as $emp) {
            $ipcr = Ipcr::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();

            if (! $ipcr) continue;

            $rating = $ratingMap[$emp->email] ?? ['score' => 4.00, 'adjectival' => 'Very Satisfactory'];

            // Collect all MPORs for this employee in H1
            $empMporIds = Mpor::where('employee_id', $emp->id)
                ->whereIn('month', ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'])
                ->pluck('id')
                ->toArray();

            $existing = AccomplishmentSubmission::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();

            if ($existing) {
                // Update to final released state
                $existing->update([
                    'status'                   => 'released_by_pmt',
                    'supervisor_id'            => $supervisor->id,
                    'supervisor_remarks'       => null,
                    'supervisor_action_at'     => Carbon::parse('2026-07-08 09:00:00'),
                    'dept_head_id'             => $deptHead->id,
                    'dept_head_remarks'        => null,
                    'dept_head_action_at'      => Carbon::parse('2026-07-10 10:00:00'),
                    'dept_head_flagged_for_calibration' => false,
                    'pmt_id'                   => $pmt->id,
                    'pmt_remarks'              => null,
                    'pmt_action_at'            => Carbon::parse('2026-07-15 14:00:00'),
                    'final_rating'             => $rating['score'],
                    'final_adjectival_rating'  => $rating['adjectival'],
                    'qar_header_id'            => $q2Header?->id,
                    'dataset_source'           => 'ipcr',
                ]);
                $submission = $existing;
            } else {
                $submission = AccomplishmentSubmission::create([
                    'employee_id'              => $emp->id,
                    'office_id'                => $hrmo->id,
                    'performance_period_id'    => $period->id,
                    'ipcr_id'                  => $ipcr->id,
                    'dataset_source'           => 'ipcr',
                    'qar_header_id'            => $q2Header?->id,
                    'status'                   => 'released_by_pmt',
                    'employee_remarks'         => null,
                    'attachments'              => null,
                    'submitted_at'             => Carbon::parse('2026-07-07 08:00:00'),
                    'supervisor_id'            => $supervisor->id,
                    'supervisor_remarks'       => null,
                    'supervisor_action_at'     => Carbon::parse('2026-07-08 09:00:00'),
                    'dept_head_id'             => $deptHead->id,
                    'dept_head_remarks'        => null,
                    'dept_head_action_at'      => Carbon::parse('2026-07-10 10:00:00'),
                    'dept_head_flagged_for_calibration' => false,
                    'pmt_id'                   => $pmt->id,
                    'pmt_remarks'              => null,
                    'pmt_action_at'            => Carbon::parse('2026-07-15 14:00:00'),
                    'final_rating'             => $rating['score'],
                    'final_adjectival_rating'  => $rating['adjectival'],
                ]);
            }

            // Attach MPORs to submission via pivot
            if (! empty($empMporIds)) {
                $submission->mpors()->syncWithoutDetaching($empMporIds);
            }

            // ── Update IPCR to released_by_pmt with final score ───────────────
            $ipcr->update([
                'status'          => Ipcr::STATUS_RELEASED_BY_PMT,
                'final_score'     => $rating['score'],
                'adjectival_rating' => $rating['adjectival'],
            ]);
        }

        $this->command->info('AccomplishmentSubmissions → released_by_pmt for all HRMO employees.');

        // ── 4. OPCR → released + OpcraAccomplishmentSubmission ───────────────
        $opcr->update(['status' => 'approved']); // already approved, ensure consistency

        $existingOpcra = OpcraAccomplishmentSubmission::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->first();

        // Compute average office rating from employee submissions
        $avgScore = round(collect($ratingMap)->avg('score'), 2);
        // >= 5.00 Outstanding, >= 4.00 VS, >= 3.00 Satisfactory, >= 2.00 Unsatisfactory
        $officeAdjectival = match (true) {
            $avgScore >= 5.00 => 'Outstanding',
            $avgScore >= 4.00 => 'Very Satisfactory',
            $avgScore >= 3.00 => 'Satisfactory',
            $avgScore >= 2.00 => 'Unsatisfactory',
            default           => 'Poor',
        };

        if ($existingOpcra) {
            $existingOpcra->update([
                'status'                  => 'released',
                'computed_office_rating'  => $avgScore,
                'final_office_rating'     => $avgScore,
                'final_adjectival_rating' => $officeAdjectival,
                'dept_head_id'            => $deptHead->id,
                'dept_head_remarks'       => null,
                'flagged_for_calibration' => false,
                'pmt_member_id'           => $pmt->id,
                'pmt_remarks'             => null,
                'submitted_at'            => Carbon::parse('2026-07-10 10:00:00'),
                'pmt_action_at'           => Carbon::parse('2026-07-15 14:00:00'),
            ]);
        } else {
            OpcraAccomplishmentSubmission::create([
                'office_id'               => $hrmo->id,
                'performance_period_id'   => $period->id,
                'dept_head_id'            => $deptHead->id,
                'status'                  => 'released',
                'computed_office_rating'  => $avgScore,
                'final_office_rating'     => $avgScore,
                'final_adjectival_rating' => $officeAdjectival,
                'dept_head_remarks'       => null,
                'flagged_for_calibration' => false,
                'pmt_member_id'           => $pmt->id,
                'pmt_remarks'             => null,
                'submitted_at'            => Carbon::parse('2026-07-10 10:00:00'),
                'pmt_action_at'           => Carbon::parse('2026-07-15 14:00:00'),
            ]);
        }

        $this->command->info("OpcraAccomplishmentSubmission → released (office avg: {$avgScore} — {$officeAdjectival}).");

        // ── 5. DevelopmentPlans (IDP) → submitted_to_ld ──────────────────────
        // Only for employees rated Unsatisfactory or Poor (LOW_RATINGS).
        // Outstanding / Very Satisfactory / Satisfactory do NOT get an IDP.
        $lowRatings = ['Unsatisfactory', 'Poor'];

        $idpRows = [
            [
                'performance_gap'          => 'Difficulty meeting quality standards and accuracy requirements in assigned outputs',
                'developmental_activity'   => 'Quality Management and Error Reduction Techniques Seminar/Workshop',
                'support_needed'           => 'Budget allocation for training registration and materials',
                'support_from_supervisor'  => 'Coaching sessions and regular feedback on output quality',
                'expected_completion'      => 'Q3 2026',
                'results'                  => '',
            ],
            [
                'performance_gap'          => 'Difficulty prioritizing tasks and meeting deadlines consistently',
                'developmental_activity'   => 'Effective Planning and Prioritization Online Course',
                'support_needed'           => 'Access to online learning platform subscription',
                'support_from_supervisor'  => 'Weekly check-ins and work planning assistance',
                'expected_completion'      => 'Q4 2026',
                'results'                  => '',
            ],
        ];

        foreach ($employees as $emp) {
            $rating = $ratingMap[$emp->email] ?? ['score' => 3.50, 'adjectival' => 'Satisfactory'];

            // Skip employees who are not low performers
            if (! in_array($rating['adjectival'], $lowRatings)) {
                continue;
            }

            $ipcr = Ipcr::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();

            $existing = DevelopmentPlan::where('employee_id', $emp->id)
                ->where('performance_period_id', $period->id)
                ->first();

            $planData = [
                'ipcr_id'               => $ipcr?->id,
                'employee_id'           => $emp->id,
                'supervisor_id'         => $supervisor->id,
                'dept_head_id'          => $deptHead->id,
                'office_id'             => $hrmo->id,
                'performance_period_id' => $period->id,
                'source_score'          => $rating['score'],
                'source_rating'         => $rating['adjectival'],
                'status'                => DevelopmentPlan::STATUS_SUBMITTED_TO_LD,
                'idp_rows'              => $idpRows,
                'prepared_by_name'      => $emp->name,
                'recommended_by_name'   => $supervisor->name,
                'approved_by_name'      => $deptHead->name,
                'supervisor_remarks'    => null,
                'supervisor_action_at'  => Carbon::parse('2026-07-18 09:00:00'),
                'dept_head_remarks'     => null,
                'dept_head_action_at'   => Carbon::parse('2026-07-20 10:00:00'),
                'lnd_sync_status'       => DevelopmentPlan::LND_SYNC_NOT_SENT,
                'submitted_to_ld_at'    => Carbon::parse('2026-07-22 09:00:00'),
                'created_by'            => $emp->id,
                'updated_by'            => $pmt->id,
            ];

            if ($existing) {
                $existing->update($planData);
            } else {
                DevelopmentPlan::create($planData);
            }
        }

        $this->command->info('DevelopmentPlans (IDP) → submitted_to_ld for Unsatisfactory/Poor employees only.');

        // ── 6. CBO — close out pending UWP + OPCR + IPCR for active CBO employees ─
        // The pending-check scans ALL active offices and ALL active employees,
        // so CBO's draft UWP, missing OPCR, and unset IPCRs all flag as pending.
        $cbo = Office::where('code', 'CBO')->first();

        if ($cbo) {
            $cboDeptHead   = User::whereHas('employee', fn ($q) => $q->where('office_id', $cbo->id))->where('role', 'dept-head')->first();
            $cboSupervisor = User::whereHas('employee', fn ($q) => $q->where('office_id', $cbo->id))->where('role', 'supervisor')->first();
            $cboEmployees  = User::whereHas('employee', fn ($q) => $q->where('office_id', $cbo->id)->where('is_active', true))->where('role', 'employee')->get();

            // Progress CBO UWP to approved so it no longer shows as "draft"
            $cboUwp = UnitWorkPlan::where('office_id', $cbo->id)
                ->where('performance_period_id', $period->id)
                ->first();

            if ($cboUwp && in_array($cboUwp->status, ['draft', 'returned'])) {
                $cboUwp->update([
                    'status'         => 'approved',
                    'submitted_at'   => Carbon::parse('2026-01-06 08:00:00'),
                    'endorsed_at'    => Carbon::parse('2026-01-08 09:00:00'),
                    'approved_at'    => Carbon::parse('2026-01-10 10:00:00'),
                    'locked_at'      => Carbon::parse('2026-01-10 10:00:00'),
                    'ratee_name'     => $cbo->name,
                    'period_covered' => 'January – June 2026',
                ]);
                $this->command->info('CBO UWP → approved.');
            }

            // Create an approved OPCR for CBO
            $cboOpcr = Opcr::firstOrCreate(
                ['office_id' => $cbo->id, 'performance_period_id' => $period->id],
                ['status' => 'approved']
            );
            if ($cboUwp && ! $cboOpcr->uwps()->where('unit_work_plans.id', $cboUwp->id)->exists()) {
                $cboOpcr->uwps()->attach($cboUwp->id);
            }
            $this->command->info('CBO OPCR → approved.');

            // Seed committed IPCRs for active CBO employees who don't have one
            foreach ($cboEmployees as $emp) {
                Ipcr::firstOrCreate(
                    ['employee_id' => $emp->id, 'performance_period_id' => $period->id],
                    [
                        'opcr_id'      => $cboOpcr->id,
                        'status'       => 'released_by_pmt',
                        'committed_at' => Carbon::parse('2026-01-12 08:00:00'),
                        'final_score'  => 3.50,
                        'adjectival_rating' => 'Satisfactory',
                    ]
                );
            }
            $this->command->info('CBO IPCRs → released_by_pmt for all active CBO employees.');

            // Seed released AccomplishmentSubmissions for CBO employees
            foreach ($cboEmployees as $emp) {
                $ipcr = Ipcr::where('employee_id', $emp->id)
                    ->where('performance_period_id', $period->id)
                    ->first();

                AccomplishmentSubmission::firstOrCreate(
                    ['employee_id' => $emp->id, 'performance_period_id' => $period->id],
                    [
                        'office_id'                        => $cbo->id,
                        'ipcr_id'                          => $ipcr?->id,
                        'dataset_source'                   => 'ipcr',
                        'status'                           => 'released_by_pmt',
                        'submitted_at'                     => Carbon::parse('2026-07-07 08:00:00'),
                        'supervisor_id'                    => $cboSupervisor?->id,
                        'supervisor_action_at'             => Carbon::parse('2026-07-08 09:00:00'),
                        'dept_head_id'                     => $cboDeptHead?->id,
                        'dept_head_action_at'              => Carbon::parse('2026-07-10 10:00:00'),
                        'dept_head_flagged_for_calibration'=> false,
                        'pmt_id'                           => $pmt->id,
                        'pmt_action_at'                    => Carbon::parse('2026-07-15 14:00:00'),
                        'final_rating'                     => 3.50,
                        'final_adjectival_rating'          => 'Satisfactory',
                    ]
                );
            }
            $this->command->info('CBO AccomplishmentSubmissions → released_by_pmt.');

            // Create the office-level OpcraAccomplishmentSubmission for CBO
            OpcraAccomplishmentSubmission::firstOrCreate(
                ['office_id' => $cbo->id, 'performance_period_id' => $period->id],
                [
                    'dept_head_id'            => $cboDeptHead?->id,
                    'status'                  => 'released',
                    'computed_office_rating'  => 3.50,
                    'final_office_rating'     => 3.50,
                    'final_adjectival_rating' => 'Satisfactory',
                    'dept_head_remarks'       => null,
                    'flagged_for_calibration' => false,
                    'pmt_member_id'           => $pmt->id,
                    'pmt_remarks'             => null,
                    'submitted_at'            => Carbon::parse('2026-07-10 10:00:00'),
                    'pmt_action_at'           => Carbon::parse('2026-07-15 14:00:00'),
                ]
            );
            $this->command->info('CBO OpcraAccomplishmentSubmission → released.');
        }

        $this->command->info('SpmsH1CompleteSeeder done. Jan-Jun 2026 is now a fully closed historical period.');
    }
}
