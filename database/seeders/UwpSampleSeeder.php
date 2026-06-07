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

class UwpSampleSeeder extends Seeder
{
    public function run(): void
    {
        $office = Office::firstOrCreate(['name' => 'Human Resource Management Office']);
        $period = PerformancePeriod::current()
            ?? PerformancePeriod::create(['name' => 'Jan-Jun 2026', 'start_date' => '2026-01-01', 'end_date' => '2026-12-31', 'is_active' => false]);
        $supervisor = User::where('role', 'supervisor')->where('office_id', $office->id)->first()
            ?? User::where('role', 'supervisor')->first();

        UnitWorkPlan::where('office_id', $office->id)->each(fn($u) => $u->delete());

        $uwp = UnitWorkPlan::create([
            'office_id'             => $office->id,
            'performance_period_id' => $period->id,
            'created_by'            => $supervisor?->id,
            'status'                => 'draft',
        ]);

        // Each indicator has qet[dimension][rating] = standard_text
        // Dimensions: quality, efficiency, timeliness — Ratings: 5=Outstanding, 4=VS, 3=S, 2=US, 1=Poor
        $data = [
            [
                'name' => 'A. CORE FUNCTIONS', 'function_type' => 'core', 'weight_percent' => 80,
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
        ];

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

                    // QET Standards — 3 dimensions × 5 ratings each
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
                    // Assignments intentionally left blank — assign manually via UI
                }
            }
        }

        $total = UwpSuccessIndicator::whereHas('uwpMfo.uwpFunction', fn($q) => $q->where('unit_work_plan_id', $uwp->id))->count();
        $this->command->info("UWP seeded: ID {$uwp->id} | {$office->name} | {$total} indicators with full QET standards");
    }
}
