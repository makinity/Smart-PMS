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
            ?? PerformancePeriod::create(['name' => 'FY 2026', 'start_date' => '2026-01-01', 'end_date' => '2026-12-31', 'is_active' => false]);
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
                                'text' => '1 recruitment plan submitted with 3-4 minor errors on the 30th day of December',
                                'qty' => 1, 'timeline' => 'recruitment plan submitted on the 30th day of December', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Recruitment plan submitted with no errors; all required sections complete and accurate',
                                        4 => 'Recruitment plan submitted with 1-2 minor errors; substantially complete',
                                        3 => 'Recruitment plan submitted with 3-4 minor errors; generally acceptable',
                                        2 => 'Recruitment plan submitted with major errors; significant revisions required',
                                        1 => 'Recruitment plan not submitted or contains critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'Plan developed using data-driven approach with optimal use of available resources',
                                        4 => 'Plan developed efficiently with good use of prior data and templates',
                                        3 => 'Plan developed adequately; standard process followed',
                                        2 => 'Plan development process was inefficient; resources not well utilized',
                                        1 => 'Plan development process was largely inefficient or unplanned',
                                    ],
                                    't' => [
                                        5 => 'Recruitment plan submitted on or before the 27th day of December',
                                        4 => 'Recruitment plan submitted on the 28th–29th day of December',
                                        3 => 'Recruitment plan submitted on the 30th day of December',
                                        2 => 'Recruitment plan submitted on the 31st day of December',
                                        1 => 'Recruitment plan submitted after December 31 or not submitted',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 recruitment plan consolidated with 3-4 minor errors on the 25th day of December',
                                'qty' => 1, 'timeline' => 'recruitment plan consolidated on the 25th day of December', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Consolidated recruitment plan has no errors; all unit plans accurately integrated',
                                        4 => 'Consolidated plan has 1-2 minor errors; substantially accurate integration',
                                        3 => 'Consolidated plan has 3-4 minor errors; generally acceptable',
                                        2 => 'Consolidated plan has major errors; significant discrepancies in integration',
                                        1 => 'Consolidated plan not produced or contains critical errors',
                                    ],
                                    'e' => [
                                        5 => 'Consolidation completed using standardized tools; no redundant inputs',
                                        4 => 'Consolidation efficient; minimal redundancy in gathering unit inputs',
                                        3 => 'Consolidation adequate; standard process followed with minor inefficiencies',
                                        2 => 'Consolidation process had notable inefficiencies or missing inputs',
                                        1 => 'Consolidation process was largely ineffective or incomplete',
                                    ],
                                    't' => [
                                        5 => 'Recruitment plan consolidated on or before the 20th day of December',
                                        4 => 'Recruitment plan consolidated on the 21st–22nd day of December',
                                        3 => 'Recruitment plan consolidated on the 25th day of December',
                                        2 => 'Recruitment plan consolidated on the 26th–27th day of December',
                                        1 => 'Recruitment plan consolidated after the 27th day or not consolidated',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 recruitment plan reviewed with 3-4 minor errors on the 5th day after receipt',
                                'qty' => 1, 'timeline' => 'recruitment plan reviewed on the 5th day after receipt', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Recruitment plan reviewed with no errors; all issues identified and documented',
                                        4 => 'Recruitment plan reviewed with 1-2 minor errors; most issues identified',
                                        3 => 'Recruitment plan reviewed with 3-4 minor errors; key issues addressed',
                                        2 => 'Review identified only some issues; major concerns overlooked',
                                        1 => 'Plan not reviewed or review was inadequate and ineffective',
                                    ],
                                    'e' => [
                                        5 => 'Review completed using standardized checklist; no unnecessary steps',
                                        4 => 'Review efficient with structured approach; minimal rework',
                                        3 => 'Review adequate; standard approach used with minor inefficiencies',
                                        2 => 'Review process inefficient; notable rework or re-checking required',
                                        1 => 'Review process was largely inefficient; extensive rework needed',
                                    ],
                                    't' => [
                                        5 => 'Recruitment plan reviewed on the 3rd day or less after receipt',
                                        4 => 'Recruitment plan reviewed on the 4th day after receipt',
                                        3 => 'Recruitment plan reviewed on the 5th day after receipt',
                                        2 => 'Recruitment plan reviewed on the 6th–7th day after receipt',
                                        1 => 'Recruitment plan reviewed beyond the 7th day or not reviewed',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% of job vacancies posted within 3 working days after approval of vacancy',
                                'qty' => 100, 'timeline' => '% of job vacancies posted within 3 working days after approval', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'All postings are accurate, complete, and formatted per CSC/agency standards',
                                        4 => 'Postings are substantially accurate with 1-2 minor formatting issues',
                                        3 => 'Postings are generally acceptable with 3-4 minor errors',
                                        2 => 'Postings contain major errors or incomplete information',
                                        1 => 'Postings not made or contain critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'Posting process fully streamlined; templates and portals used optimally',
                                        4 => 'Posting process efficient; standard tools utilized effectively',
                                        3 => 'Posting process adequate; minor inefficiencies in workflow',
                                        2 => 'Posting process had notable inefficiencies; manual workarounds used',
                                        1 => 'Posting process was largely inefficient or largely manual',
                                    ],
                                    't' => [
                                        5 => '100% of vacancies posted within 1 working day after approval',
                                        4 => '100% of vacancies posted within 2 working days after approval',
                                        3 => '100% of vacancies posted within 3 working days after approval',
                                        2 => 'Vacancies posted within 4–5 working days after approval',
                                        1 => 'Vacancies posted beyond 5 working days or not posted',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 selection line-up prepared with 3-4 minor errors within 5 working days after deadline of application',
                                'qty' => 1, 'timeline' => 'selection line-up prepared within 5 working days after deadline of application', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'Selection line-up prepared with no errors; all eligible applicants correctly listed',
                                        4 => 'Selection line-up prepared with 1-2 minor errors; substantially complete',
                                        3 => 'Selection line-up prepared with 3-4 minor errors; generally acceptable',
                                        2 => 'Selection line-up prepared with major errors or missing eligible applicants',
                                        1 => 'Selection line-up not prepared or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'Qualification screening completed using HRIS/database tools with no manual errors',
                                        4 => 'Screening efficient; tools utilized with minimal manual verification',
                                        3 => 'Screening adequate; standard process followed',
                                        2 => 'Screening process inefficient; notable manual errors or redundancies',
                                        1 => 'Screening process largely inefficient; significant rework required',
                                    ],
                                    't' => [
                                        5 => 'Selection line-up prepared within 3 working days after application deadline',
                                        4 => 'Selection line-up prepared within 4 working days after application deadline',
                                        3 => 'Selection line-up prepared within 5 working days after application deadline',
                                        2 => 'Selection line-up prepared within 6–7 working days after application deadline',
                                        1 => 'Selection line-up prepared beyond 7 working days or not prepared',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'PERSONNEL BENEFITS MANAGEMENT (PBM)',
                        'indicators' => [
                            [
                                'text' => '100% of leave applications processed with 3-4 minor errors within 3 working days upon receipt',
                                'qty' => 100, 'timeline' => '% of leave applications processed within 3 working days upon receipt', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => '100% of applications processed with no errors; all entries accurate and compliant',
                                        4 => '100% processed with 1-2 minor errors; substantially accurate',
                                        3 => '100% processed with 3-4 minor errors; generally acceptable',
                                        2 => 'Applications processed with major errors or non-compliance issues',
                                        1 => 'Applications not processed or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'Processing fully automated/streamlined; leave balance verified via HRIS with zero rework',
                                        4 => 'Processing efficient; HRIS utilized effectively with minimal manual steps',
                                        3 => 'Processing adequate; standard workflow followed',
                                        2 => 'Processing had notable inefficiencies; manual workarounds required',
                                        1 => 'Processing was largely inefficient or manual',
                                    ],
                                    't' => [
                                        5 => '100% of applications processed within 1 working day upon receipt',
                                        4 => '100% of applications processed within 2 working days upon receipt',
                                        3 => '100% of applications processed within 3 working days upon receipt',
                                        2 => 'Applications processed within 4–5 working days upon receipt',
                                        1 => 'Applications processed beyond 5 working days or not processed',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% of monetization requests processed with 3-4 minor errors within 5 working days upon receipt',
                                'qty' => 100, 'timeline' => '% of monetization requests processed within 5 working days upon receipt', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'All requests processed with no errors; computations verified and accurate',
                                        4 => 'Requests processed with 1-2 minor errors; computations substantially correct',
                                        3 => 'Requests processed with 3-4 minor errors; generally acceptable',
                                        2 => 'Requests processed with major computational or documentary errors',
                                        1 => 'Requests not processed or contain critical errors',
                                    ],
                                    'e' => [
                                        5 => 'Leave balance verification and computation fully automated; zero rework',
                                        4 => 'Process efficient with good use of HRIS data; minimal manual steps',
                                        3 => 'Process adequate; standard steps followed',
                                        2 => 'Process had notable inefficiencies; manual computation required',
                                        1 => 'Process largely inefficient; significant rework required',
                                    ],
                                    't' => [
                                        5 => 'Requests processed within 3 working days upon receipt',
                                        4 => 'Requests processed within 4 working days upon receipt',
                                        3 => 'Requests processed within 5 working days upon receipt',
                                        2 => 'Requests processed within 6–7 working days upon receipt',
                                        1 => 'Requests processed beyond 7 working days or not processed',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% of retirement gratuity pay processed with 3-4 minor errors within 10 working days upon receipt of complete documents',
                                'qty' => 100, 'timeline' => '% of retirement gratuity pay processed within 10 working days upon receipt', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'All documents processed with no errors; computations verified by authorized personnel',
                                        4 => 'Documents processed with 1-2 minor errors; substantially accurate',
                                        3 => 'Documents processed with 3-4 minor errors; generally acceptable',
                                        2 => 'Documents processed with major errors or missing required attachments',
                                        1 => 'Documents not processed or contain critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'Process fully streamlined; retirement computation tools utilized optimally',
                                        4 => 'Process efficient; standard tools and templates used effectively',
                                        3 => 'Process adequate; standard workflow followed',
                                        2 => 'Process had notable inefficiencies; manual workarounds required',
                                        1 => 'Process largely inefficient; significant rework required',
                                    ],
                                    't' => [
                                        5 => 'Retirement gratuity pay processed within 7 working days upon receipt',
                                        4 => 'Processed within 8–9 working days upon receipt',
                                        3 => 'Processed within 10 working days upon receipt',
                                        2 => 'Processed within 11–13 working days upon receipt',
                                        1 => 'Processed beyond 13 working days or not processed',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'PERSONNEL RELATIONS AND WELFARE (PRW)',
                        'indicators' => [
                            [
                                'text' => '4 quarterly recognition activities conducted with 3-4 minor lapses per activity',
                                'qty' => 4, 'timeline' => 'quarterly recognition activities conducted', 'budget' => 50000,
                                'qet' => [
                                    'q' => [
                                        5 => 'All 4 activities conducted with no lapses; all awardees recognized properly and on time',
                                        4 => 'All 4 activities conducted with 1-2 minor lapses; substantially well-executed',
                                        3 => 'All 4 activities conducted with 3-4 minor lapses; generally acceptable',
                                        2 => 'Activities conducted with major lapses; significant issues in execution',
                                        1 => 'Less than 4 activities conducted or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'Activities planned and executed within budget; all resources optimally utilized',
                                        4 => 'Activities executed efficiently; budget well-managed with minimal variances',
                                        3 => 'Activities executed adequately; budget managed within acceptable limits',
                                        2 => 'Activities had notable resource inefficiencies or budget overruns',
                                        1 => 'Activities largely inefficient or exceeded budget significantly',
                                    ],
                                    't' => [
                                        5 => 'All 4 activities conducted on scheduled dates per approved annual plan',
                                        4 => 'All activities conducted within 1–2 days of scheduled date',
                                        3 => 'All activities conducted within 3–5 days of scheduled date',
                                        2 => 'Some activities conducted beyond 5 days of scheduled date',
                                        1 => 'Activities conducted significantly late or not conducted',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 annual employee welfare program implemented with 3-4 minor lapses',
                                'qty' => 1, 'timeline' => 'annual employee welfare program implemented', 'budget' => 30000,
                                'qet' => [
                                    'q' => [
                                        5 => 'Welfare program fully implemented; all planned components delivered with no lapses',
                                        4 => 'Welfare program implemented with 1-2 minor lapses; substantially complete',
                                        3 => 'Welfare program implemented with 3-4 minor lapses; generally acceptable',
                                        2 => 'Welfare program implemented with major lapses; key components not delivered',
                                        1 => 'Welfare program not implemented or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'Program executed within budget; all resources optimally allocated',
                                        4 => 'Program executed efficiently; good budget management',
                                        3 => 'Program executed adequately; budget managed within acceptable range',
                                        2 => 'Program had notable inefficiencies or budget issues',
                                        1 => 'Program largely inefficient or significantly over budget',
                                    ],
                                    't' => [
                                        5 => 'Welfare program fully implemented by Q3 per annual plan',
                                        4 => 'Welfare program implemented by end of Q3 with minor delays',
                                        3 => 'Welfare program implemented by end of Q4',
                                        2 => 'Some components implemented beyond Q4',
                                        1 => 'Program not completed within the year',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'HUMAN RESOURCE DEVELOPMENT (HRD)',
                        'indicators' => [
                            [
                                'text' => '1 training needs analysis (TNA) report prepared with 3-4 minor errors by the 31st day of January',
                                'qty' => 1, 'timeline' => 'TNA report prepared by January 31', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'TNA report prepared with no errors; all data sources validated and analysis complete',
                                        4 => 'TNA report prepared with 1-2 minor errors; substantially accurate',
                                        3 => 'TNA report prepared with 3-4 minor errors; generally acceptable',
                                        2 => 'TNA report prepared with major errors or significant data gaps',
                                        1 => 'TNA report not prepared or contains critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'TNA conducted using validated tools; data collection fully systematic',
                                        4 => 'TNA conducted efficiently; most data collected systematically',
                                        3 => 'TNA conducted adequately; standard tools used',
                                        2 => 'TNA process had notable gaps in data collection or methodology',
                                        1 => 'TNA process was largely inefficient or incomplete',
                                    ],
                                    't' => [
                                        5 => 'TNA report prepared on or before January 25',
                                        4 => 'TNA report prepared on January 26–29',
                                        3 => 'TNA report prepared by January 31',
                                        2 => 'TNA report prepared February 1–7',
                                        1 => 'TNA report prepared after February 7 or not prepared',
                                    ],
                                ],
                            ],
                            [
                                'text' => '1 Annual Training and Development Plan (ATDP) prepared with 3-4 minor errors by the 15th day of February',
                                'qty' => 1, 'timeline' => 'ATDP prepared by February 15', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => 'ATDP prepared with no errors; all TNA findings accurately translated into plan',
                                        4 => 'ATDP prepared with 1-2 minor errors; substantially aligned with TNA',
                                        3 => 'ATDP prepared with 3-4 minor errors; generally acceptable',
                                        2 => 'ATDP prepared with major errors or significant misalignment with TNA',
                                        1 => 'ATDP not prepared or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'ATDP developed using TNA data with optimal resource planning',
                                        4 => 'ATDP developed efficiently; good alignment between needs and resources',
                                        3 => 'ATDP developed adequately; standard process followed',
                                        2 => 'ATDP development had notable inefficiencies in planning',
                                        1 => 'ATDP development was largely inefficient or incomplete',
                                    ],
                                    't' => [
                                        5 => 'ATDP prepared on or before February 10',
                                        4 => 'ATDP prepared February 11–13',
                                        3 => 'ATDP prepared by February 15',
                                        2 => 'ATDP prepared February 16–20',
                                        1 => 'ATDP prepared after February 20 or not prepared',
                                    ],
                                ],
                            ],
                            [
                                'text' => '100% of approved training programs facilitated with 3-4 minor lapses per training',
                                'qty' => 100, 'timeline' => '% of approved training programs facilitated', 'budget' => 150000,
                                'qet' => [
                                    'q' => [
                                        5 => '100% of training programs facilitated with no lapses; all learning objectives met',
                                        4 => '100% facilitated with 1-2 minor lapses; objectives substantially met',
                                        3 => '100% facilitated with 3-4 minor lapses; generally acceptable',
                                        2 => 'Training facilitated with major lapses; key objectives not met',
                                        1 => 'Less than 100% of approved trainings facilitated or critically deficient',
                                    ],
                                    'e' => [
                                        5 => 'All trainings conducted within approved budget; resources optimally utilized',
                                        4 => 'Trainings conducted efficiently; budget well-managed',
                                        3 => 'Trainings conducted adequately; budget within acceptable limits',
                                        2 => 'Trainings had notable resource inefficiencies or budget variances',
                                        1 => 'Trainings largely inefficient or significantly over budget',
                                    ],
                                    't' => [
                                        5 => 'All training programs conducted on scheduled dates per ATDP',
                                        4 => 'All programs conducted within 1 week of scheduled date',
                                        3 => 'All programs conducted within 2 weeks of scheduled date',
                                        2 => 'Some programs conducted more than 2 weeks late',
                                        1 => 'Programs significantly delayed or not conducted',
                                    ],
                                ],
                            ],
                        ],
                    ],
                    [
                        'title' => 'PERFORMANCE MANAGEMENT (PM)',
                        'indicators' => [
                            [
                                'text' => '100% of IPCR forms collected and reviewed with 3-4 minor errors within 5 working days after deadline',
                                'qty' => 100, 'timeline' => '% of IPCR forms collected and reviewed within 5 working days after deadline', 'budget' => 0,
                                'qet' => [
                                    'q' => [
                                        5 => '100% of IPCR forms collected and reviewed with no errors; all data accurate',
                                        4 => '100% collected with 1-2 minor errors; substantially accurate',
                                        3 => '100% collected with 3-4 minor errors; generally acceptable',
                                        2 => 'Forms collected with major errors or significant missing data',
                                        1 => 'Forms not fully collected or contain critical deficiencies',
                                    ],
                                    'e' => [
                                        5 => 'Collection and review fully systematized; tracking tool used with zero lapses',
                                        4 => 'Collection efficient; tracking used effectively',
                                        3 => 'Collection adequate; standard process followed',
                                        2 => 'Collection had notable inefficiencies; manual tracking required',
                                        1 => 'Collection largely inefficient; significant forms missing',
                                    ],
                                    't' => [
                                        5 => 'All forms collected and reviewed within 3 working days after deadline',
                                        4 => 'All forms collected within 4 working days after deadline',
                                        3 => 'All forms collected within 5 working days after deadline',
                                        2 => 'Forms collected within 6–8 working days after deadline',
                                        1 => 'Forms collected beyond 8 working days or not collected',
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
