<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Office;
use App\Models\UnitWorkPlan;
use App\Models\UwpFunction;
use App\Models\UwpMfo;
use App\Models\UwpSuccessIndicator;
use App\Models\UwpQetStandard;
use App\Models\PerformancePeriod;
use App\Models\User;

/**
 * Seeds the Jul-Dec 2026 performance period and creates draft UWPs
 * for HRMO and CBO with the same indicators as the Jan-Jun 2026 period.
 *
 * Mirrors UwpSampleSeeder exactly — only the period changes.
 */
class UwpSampleSeederH2 extends Seeder
{
    public function run(): void
    {
        // ── Performance period ────────────────────────────────────────────────
        // Deactivate all existing periods first — Jul-Dec 2026 is now the active one
        PerformancePeriod::query()->update(['is_active' => false]);

        $period = PerformancePeriod::where('name', 'Jul-Dec 2026')->first()
            ?? PerformancePeriod::create([
                'name'       => 'Jul-Dec 2026',
                'start_date' => '2026-07-01',
                'end_date'   => '2026-12-31',
                'is_active'  => true,
            ]);

        // Ensure it is active (handles re-seed case)
        $period->update(['is_active' => true]);

        // ── Offices ───────────────────────────────────────────────────────────
        $hrmo = Office::firstOrCreate(
            ['code' => 'HRMO'],
            ['name' => 'Human Resource Management Office']
        );
        $cbo = Office::firstOrCreate(
            ['code' => 'CBO'],
            ['name' => 'City Budget Office']
        );

        $hrmoSupervisor = User::where('role', 'supervisor')
            ->whereHas('employee', fn ($q) => $q->where('office_id', $hrmo->id))
            ->first();

        $cboSupervisor = User::where('role', 'supervisor')
            ->whereHas('employee', fn ($q) => $q->where('office_id', $cbo->id))
            ->first();

        // ── Shared indicator blueprint (same as H1) ───────────────────────────
        $data = [
            [
                'name' => 'A. CORE FUNCTIONS', 'function_type' => 'core', 'weight_percent' => 70,
                'mfos' => [
                    [
                        'title' => 'RECRUITMENT, SELECTION AND PLACEMENT (RSP)',
                        'indicators' => [
                            [
                                'text' => '1 plantilla prepared with 3-4 minor errors on the 26th day after instruction',
                                'qty' => 1, 'timeline' => 'plantilla prepared on the 26th day after instruction', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Plantilla prepared with no errors; all entries are accurate and complete',
                                        4 => 'Plantilla prepared with 1-2 minor errors; entries are substantially accurate',
                                        3 => 'Plantilla prepared with 3-4 minor errors; entries are generally accurate',
                                        2 => 'Plantilla prepared with major errors affecting accuracy or completeness',
                                        1 => 'Plantilla not prepared or contains critical errors rendering it unusable',
                                    ],
                                    'e' => [
                                        5 => 'All required documents and references utilized optimally; no redundant steps',
                                        4 => 'Most resources utilized efficiently; minimal redundancy in process',
                                        3 => 'Resources utilized adequately; process followed with minor inefficiencies',
                                        2 => 'Resources not fully optimized; process contained notable inefficiencies',
                                        1 => 'Resources poorly utilized; process was largely inefficient',
                                    ],
                                    't' => [
                                        5 => 'Plantilla prepared on the 23rd day or less after instruction',
                                        4 => 'Plantilla prepared on the 24th day after instruction',
                                        3 => 'Plantilla prepared on the 26th day after instruction',
                                        2 => 'Plantilla prepared on the 27th–30th day after instruction',
                                        1 => 'Plantilla prepared beyond the 30th day or not prepared at all',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 plantilla reviewed with 3-4 minor errors on the 5th day after preparation',
                                'qty' => 1, 'timeline' => 'plantilla reviewed on the 5th day after preparation', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Plantilla reviewed with no errors; all discrepancies identified and corrected',
                                        4 => 'Plantilla reviewed with 1-2 minor errors; most discrepancies addressed',
                                        3 => 'Plantilla reviewed with 3-4 minor errors; general accuracy maintained',
                                        2 => 'Plantilla reviewed with major errors; significant discrepancies remain',
                                        1 => 'Plantilla not reviewed or returned with critical errors',
                                    ],
                                    'e' => [
                                        5 => 'Review process completed using standard checklist with no rework required',
                                        4 => 'Review completed with minimal rework; checklist used effectively',
                                        3 => 'Review completed adequately; minor rework needed',
                                        2 => 'Review process inefficient; notable rework required',
                                        1 => 'Review process was largely ineffective; extensive rework needed',
                                    ],
                                    't' => [
                                        5 => 'Plantilla reviewed on the 3rd day or less after preparation',
                                        4 => 'Plantilla reviewed on the 4th day after preparation',
                                        3 => 'Plantilla reviewed on the 5th day after preparation',
                                        2 => 'Plantilla reviewed on the 6th–7th day after preparation',
                                        1 => 'Plantilla reviewed beyond the 7th day or not reviewed',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 plantilla of personnel scanned, banked & bound with 3-4 minor errors within 60 minutes upon receipt',
                                'qty' => 1, 'timeline' => 'plantilla scanned, banked & bound within 60 minutes upon receipt', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => '100% of the plantilla scanned, banked & bound with no errors',
                                        4 => '90–99% of the plantilla scanned, banked & bound with 1-2 minor errors',
                                        3 => '80–89% of the plantilla scanned, banked & bound with 3-4 minor errors',
                                        2 => 'Less than 80% scanned or major errors in scanning/binding',
                                        1 => 'Plantilla not scanned, banked, or bound; task not completed',
                                    ],
                                    'e' => [
                                        5 => 'Equipment and resources fully optimized; zero downtime during process',
                                        4 => 'Resources well-utilized; minimal delays due to equipment or process',
                                        3 => 'Resources adequately utilized; minor inefficiencies encountered',
                                        2 => 'Resources underutilized; process had notable delays or redundancies',
                                        1 => 'Process was largely inefficient; significant resource wastage',
                                    ],
                                    't' => [
                                        5 => 'Task completed within 50 minutes upon receipt',
                                        4 => 'Task completed within 55 minutes upon receipt',
                                        3 => 'Task completed within 60 minutes upon receipt',
                                        2 => 'Task completed within 61–75 minutes upon receipt',
                                        1 => 'Task completed beyond 75 minutes or not completed',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 consolidated OPCR performance summary report prepared with 3-4 minor errors within 10 working days after rating period',
                                'qty' => 1, 'timeline' => 'consolidated OPCR report prepared within 10 working days after rating period', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Report prepared with no errors; all data accurately consolidated and validated',
                                        4 => 'Report prepared with 1-2 minor errors; substantially accurate',
                                        3 => 'Report prepared with 3-4 minor errors; generally acceptable',
                                        2 => 'Report prepared with major errors or significant data gaps',
                                        1 => 'Report not prepared or contains critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'Consolidation fully automated using HRIS data; zero manual errors',
                                        4 => 'Consolidation efficient; HRIS used with minimal manual steps',
                                        3 => 'Consolidation adequate; standard tools used',
                                        2 => 'Consolidation had notable inefficiencies; manual data entry required',
                                        1 => 'Consolidation largely inefficient; significant rework required',
                                    ],
                                    't' => [
                                        5 => 'Report prepared within 7 working days after rating period',
                                        4 => 'Report prepared within 8–9 working days after rating period',
                                        3 => 'Report prepared within 10 working days after rating period',
                                        2 => 'Report prepared within 11–13 working days after rating period',
                                        1 => 'Report prepared beyond 13 working days or not prepared',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'B. SUPPORT FUNCTIONS', 'function_type' => 'support', 'weight_percent' => 20,
                'mfos' => [
                    [
                        'title' => 'Administrative and Records Management',
                        'indicators' => [
                            [
                                'text' => '100% of incoming and outgoing communications acted upon within 2 working days upon receipt',
                                'qty' => 100, 'timeline' => '% of communications acted upon within 2 working days upon receipt', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'All communications acted upon accurately; responses complete and appropriately worded',
                                        4 => 'Communications acted upon with 1-2 minor errors; substantially accurate',
                                        3 => 'Communications acted upon with 3-4 minor errors; generally acceptable',
                                        2 => 'Responses contain major errors or are incomplete',
                                        1 => 'Communications not acted upon or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'All communications routed and tracked using DTS; zero manual routing errors',
                                        4 => 'Communications tracked efficiently; DTS used with minimal manual steps',
                                        3 => 'Communications tracked adequately; standard process followed',
                                        2 => 'Communication process had notable inefficiencies in routing or tracking',
                                        1 => 'Communication process largely inefficient; significant backlogs',
                                    ],
                                    't' => [
                                        5 => '100% of communications acted upon within 1 working day upon receipt',
                                        4 => '100% acted upon within 1.5 working days upon receipt',
                                        3 => '100% acted upon within 2 working days upon receipt',
                                        2 => 'Communications acted upon within 3 working days upon receipt',
                                        1 => 'Communications acted upon beyond 3 working days or not acted upon',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% attendance in required meetings, trainings, and seminars',
                                'qty' => 100, 'timeline' => '% attendance in required meetings, trainings, and seminars', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => '100% attendance; actively participated and submitted required outputs/reports',
                                        4 => '100% attendance; substantially participated with minor gaps in outputs',
                                        3 => '100% attendance; adequate participation with 3-4 minor issues',
                                        2 => 'Attended but with major participation gaps or missing required outputs',
                                        1 => 'Less than 100% attendance or did not participate meaningfully',
                                    ],
                                    'e' => [
                                        5 => 'Attendance efficiently managed; advance preparation done for all sessions',
                                        4 => 'Attendance managed efficiently; prepared for most sessions',
                                        3 => 'Attendance managed adequately; standard preparation done',
                                        2 => 'Attendance management had notable inefficiencies',
                                        1 => 'Attendance management was largely poor or unplanned',
                                    ],
                                    't' => [
                                        5 => 'Always present and on time for all required meetings and activities',
                                        4 => 'Present on time with 1-2 tardiness instances',
                                        3 => 'Present with 3-4 tardiness instances; generally compliant',
                                        2 => 'Present but with frequent tardiness or early departures',
                                        1 => 'Missed required activities or consistently tardy',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% of required reports submitted on time with 3-4 minor errors',
                                'qty' => 100, 'timeline' => '% of required reports submitted on time', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => '100% of reports submitted with no errors; all data accurate and complete',
                                        4 => '100% submitted with 1-2 minor errors; substantially accurate',
                                        3 => '100% submitted with 3-4 minor errors; generally acceptable',
                                        2 => 'Reports submitted with major errors or incomplete data',
                                        1 => 'Reports not submitted or contain critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'All reports prepared using standard templates; no redundant data entry',
                                        4 => 'Reports prepared efficiently; minimal redundant steps',
                                        3 => 'Reports prepared adequately; standard process followed',
                                        2 => 'Report preparation had notable inefficiencies',
                                        1 => 'Report preparation was largely inefficient',
                                    ],
                                    't' => [
                                        5 => '100% of reports submitted 1 day or more before deadline',
                                        4 => '100% of reports submitted on the day of deadline',
                                        3 => '100% of reports submitted within 1 day after deadline',
                                        2 => 'Reports submitted 2–3 days after deadline',
                                        1 => 'Reports submitted beyond 3 days after deadline or not submitted',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'C. STRATEGIC FUNCTIONS', 'function_type' => 'strategic', 'weight_percent' => 10,
                'mfos' => [
                    [
                        'title' => 'STRATEGIC PLANNING AND ORGANIZATIONAL DEVELOPMENT',
                        'indicators' => [
                            [
                                'text' => '1 strategic HR plan formulated and submitted within 30 working days',
                                'qty' => 1, 'timeline' => 'strategic HR plan submitted within 30 working days', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Plan is comprehensive, data-driven, and fully aligned with office mandate; zero revisions required',
                                        4 => 'Plan is substantially complete and aligned; 1-2 minor revisions needed',
                                        3 => 'Plan is generally acceptable with 3-4 minor gaps',
                                        2 => 'Plan has major gaps or misalignment with strategic objectives',
                                        1 => 'Plan not submitted or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'Planning process optimized; consultations and data gathering completed ahead of schedule',
                                        4 => 'Process efficient; most steps completed with minimal delays',
                                        3 => 'Process adequate; standard planning steps followed',
                                        2 => 'Planning process had notable inefficiencies or redundant steps',
                                        1 => 'Planning process was largely unstructured or inefficient',
                                    ],
                                    't' => [
                                        5 => 'Plan submitted within 25 working days',
                                        4 => 'Plan submitted within 27 working days',
                                        3 => 'Plan submitted within 30 working days',
                                        2 => 'Plan submitted within 31–35 working days',
                                        1 => 'Plan submitted beyond 35 working days or not submitted',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% of strategic objectives monitored and reported every quarter',
                                'qty' => 100, 'timeline' => '% of strategic objectives monitored and reported every quarter', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => '100% of objectives monitored with accurate, complete, and actionable reports',
                                        4 => '100% monitored with 1-2 minor gaps in reporting',
                                        3 => '100% monitored with 3-4 minor gaps or inconsistencies',
                                        2 => 'Monitoring done but with major gaps or inaccurate data',
                                        1 => 'Objectives not monitored or reports not submitted',
                                    ],
                                    'e' => [
                                        5 => 'Monitoring fully systematized using performance dashboards; no manual tracking errors',
                                        4 => 'Monitoring efficient; tools used effectively with minimal manual steps',
                                        3 => 'Monitoring adequate; standard tracking process followed',
                                        2 => 'Monitoring process had notable inefficiencies',
                                        1 => 'Monitoring largely ad hoc or untracked',
                                    ],
                                    't' => [
                                        5 => 'Reports submitted at least 5 days before end of each quarter',
                                        4 => 'Reports submitted 1-4 days before end of each quarter',
                                        3 => 'Reports submitted on the last day of each quarter',
                                        2 => 'Reports submitted 1-5 days after end of quarter',
                                        1 => 'Reports submitted beyond 5 days after end of quarter or not submitted',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 capacity development plan prepared and endorsed within 20 working days',
                                'qty' => 1, 'timeline' => 'capacity development plan endorsed within 20 working days', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Plan is comprehensive, need-based, and fully endorsed; zero revisions required',
                                        4 => 'Plan substantially complete; 1-2 minor revisions needed before endorsement',
                                        3 => 'Plan acceptable with 3-4 minor gaps; endorsed with minor comments',
                                        2 => 'Plan has major gaps; returned for significant revisions',
                                        1 => 'Plan not prepared or not endorsed',
                                    ],
                                    'e' => [
                                        5 => 'Training needs analysis completed using validated tools; plan derived systematically',
                                        4 => 'Plan developed efficiently; TNA tools used with minimal gaps',
                                        3 => 'Plan developed adequately; standard process followed',
                                        2 => 'Plan development had notable inefficiencies in data gathering',
                                        1 => 'Plan development was largely unstructured',
                                    ],
                                    't' => [
                                        5 => 'Plan endorsed within 15 working days',
                                        4 => 'Plan endorsed within 17 working days',
                                        3 => 'Plan endorsed within 20 working days',
                                        2 => 'Plan endorsed within 21–25 working days',
                                        1 => 'Plan endorsed beyond 25 working days or not endorsed',
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        // ── Helper: build a UWP with all functions/MFOs/indicators ───────────
        $buildUwp = function (UnitWorkPlan $uwp) use ($data): int {
            foreach ($data as $sort => $fnData) {
                $fn = UwpFunction::create([
                    'unit_work_plan_id' => $uwp->id,
                    'name'              => $fnData['name'],
                    'function_type'     => $fnData['function_type'],
                    'weight_percent'    => $fnData['weight_percent'],
                    'sort_order'        => $sort + 1,
                ]);

                foreach ($fnData['mfos'] as $mSort => $mfoData) {
                    $mfo = UwpMfo::create([
                        'uwp_function_id' => $fn->id,
                        'title'           => $mfoData['title'],
                        'weight_percent'  => 0,
                        'sort_order'      => $mSort + 1,
                    ]);

                    foreach ($mfoData['indicators'] as $iSort => $siData) {
                        $si = UwpSuccessIndicator::create([
                            'uwp_mfo_id'      => $mfo->id,
                            'indicator_text'  => $siData['text'],
                            'target_quantity' => $siData['qty'],
                            'target_timeline' => $siData['timeline'],
                            'allotted_budget' => $siData['budget'],
                            'sort_order'      => $iSort + 1,
                        ]);

                        foreach ($siData['qet'] as $dimension => $ratings) {
                            foreach ($ratings as $rating => $text) {
                                UwpQetStandard::create([
                                    'uwp_success_indicator_id' => $si->id,
                                    'dimension'                => $dimension,
                                    'rating'                   => $rating,
                                    'standard_text'            => $text,
                                ]);
                            }
                        }
                    }
                }
            }

            return UwpSuccessIndicator::whereHas(
                'uwpMfo.uwpFunction',
                fn ($q) => $q->where('unit_work_plan_id', $uwp->id)
            )->count();
        };

        // ── HRMO UWP ──────────────────────────────────────────────────────────
        UnitWorkPlan::where('office_id', $hrmo->id)
            ->where('performance_period_id', $period->id)
            ->each(fn ($u) => $u->delete());

        $hrmoUwp = UnitWorkPlan::create([
            'office_id'             => $hrmo->id,
            'performance_period_id' => $period->id,
            'created_by'            => $hrmoSupervisor?->id,
            'status'                => 'draft',
        ]);

        $hrmoTotal = $buildUwp($hrmoUwp);
        $this->command->info("UWP seeded: ID {$hrmoUwp->id} | {$hrmo->name} | {$hrmoTotal} indicators (draft)");

        // ── CBO UWP ───────────────────────────────────────────────────────────
        UnitWorkPlan::where('office_id', $cbo->id)
            ->where('performance_period_id', $period->id)
            ->each(fn ($u) => $u->delete());

        $cboUwp = UnitWorkPlan::create([
            'office_id'             => $cbo->id,
            'performance_period_id' => $period->id,
            'created_by'            => $cboSupervisor?->id,
            'status'                => 'draft',
        ]);

        $cboTotal = $buildUwp($cboUwp);
        $this->command->info("UWP seeded: ID {$cboUwp->id} | {$cbo->name} | {$cboTotal} indicators (draft, no assignments)");
    }
}
