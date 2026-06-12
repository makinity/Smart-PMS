<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeds employee_performance_snapshots with synthetic but realistic data
 * based on actual employees, indicators, and office structure in the system.
 *
 * Generates 3 simulated past periods × 9 employees × 7 indicators = ~189 rows
 * with statistically varied scores to train the Random Forest model.
 */
class MlTrainingDataSeeder extends Seeder
{
    // Real employees from DB
    private array $employees = [
        ['id' => 3,  'name' => 'Maria Santos',    'position' => 'HRMO Department Head', 'office_id' => 1, 'office_name' => 'Human Resource Management Office', 'office_size' => 6],
        ['id' => 4,  'name' => 'Jose Reyes',       'position' => 'HR Supervisor',         'office_id' => 1, 'office_name' => 'Human Resource Management Office', 'office_size' => 6],
        ['id' => 5,  'name' => 'Ana Dela Cruz',    'position' => 'HR Assistant I',         'office_id' => 1, 'office_name' => 'Human Resource Management Office', 'office_size' => 6],
        ['id' => 6,  'name' => 'Carlos Mendoza',   'position' => 'HR Assistant II',        'office_id' => 1, 'office_name' => 'Human Resource Management Office', 'office_size' => 6],
        ['id' => 7,  'name' => 'Liza Bautista',    'position' => 'Administrative Aide',    'office_id' => 1, 'office_name' => 'Human Resource Management Office', 'office_size' => 6],
        ['id' => 8,  'name' => 'Ramon Villanueva', 'position' => 'Records Officer',        'office_id' => 1, 'office_name' => 'Human Resource Management Office', 'office_size' => 6],
        ['id' => 9,  'name' => 'Patricia Gomez',   'position' => 'CBO Department Head',    'office_id' => 2, 'office_name' => 'City Budget Office',                'office_size' => 3],
        ['id' => 10, 'name' => 'Eduardo Lim',       'position' => 'Budget Supervisor',      'office_id' => 2, 'office_name' => 'City Budget Office',                'office_size' => 3],
        ['id' => 11, 'name' => 'Rowena Castro',     'position' => 'Budget Analyst',         'office_id' => 2, 'office_name' => 'City Budget Office',                'office_size' => 3],
    ];

    // Real indicators from DB
    private array $indicators = [
        ['id' => 1, 'text' => '1 plantilla prepared with 3-4 minor errors on the 26th day after instruction',        'qty' => 1,   'timeline_days' => 26,  'function_type' => 'core',    'mfo_title' => 'HR Management'],
        ['id' => 2, 'text' => '1 plantilla reviewed with 3-4 minor errors on the 5th day after preparation',         'qty' => 1,   'timeline_days' => 5,   'function_type' => 'core',    'mfo_title' => 'HR Management'],
        ['id' => 3, 'text' => '1 plantilla of personnel scanned, banked & bound within 60 minutes upon receipt',     'qty' => 1,   'timeline_days' => 1,   'function_type' => 'support', 'mfo_title' => 'Records Management'],
        ['id' => 4, 'text' => '1 consolidated OPCR performance summary report prepared within 10 working days',       'qty' => 1,   'timeline_days' => 10,  'function_type' => 'core',    'mfo_title' => 'Performance Management'],
        ['id' => 5, 'text' => '100% of incoming and outgoing communications acted upon within 2 working days',        'qty' => 100, 'timeline_days' => 2,   'function_type' => 'support', 'mfo_title' => 'Administrative Support'],
        ['id' => 6, 'text' => '100% attendance in required meetings, trainings, and seminars',                        'qty' => 100, 'timeline_days' => 180, 'function_type' => 'support', 'mfo_title' => 'Administrative Support'],
        ['id' => 7, 'text' => '100% of required reports submitted on time with 3-4 minor errors',                     'qty' => 100, 'timeline_days' => 7,   'function_type' => 'core',    'mfo_title' => 'Reporting'],
    ];

    /**
     * Score profiles per position — reflects realistic performance patterns.
     * [mean, std_dev] — higher seniority = higher mean, lower variance
     */
    private array $scoreProfiles = [
        'HRMO Department Head' => [4.6, 0.2],
        'HR Supervisor'        => [4.3, 0.3],
        'HR Assistant I'       => [3.8, 0.4],
        'HR Assistant II'      => [3.9, 0.35],
        'Administrative Aide'  => [3.4, 0.5],
        'Records Officer'      => [3.7, 0.45],
        'CBO Department Head'  => [4.5, 0.2],
        'Budget Supervisor'    => [4.2, 0.3],
        'Budget Analyst'       => [3.9, 0.4],
    ];

    // Simulated past periods (period_id, period_name)
    private array $periods = [
        ['id' => 1, 'name' => 'Jan-Jun 2026'],
    ];

    public function run(): void
    {
        // Only seed if table is empty — avoids wiping real data
        if (DB::table('employee_performance_snapshots')->count() > 0) {
            $this->command->info('ML snapshots already exist, skipping seed.');
            return;
        }

        $rows = [];
        $now  = now()->toDateTimeString();

        // Simulate 4 additional past periods for training data
        $simulatedPeriods = [
            ['id' => 1,    'name' => 'Jan-Jun 2026'],
            ['id' => 9901, 'name' => 'Jul-Dec 2025'],
            ['id' => 9902, 'name' => 'Jan-Jun 2025'],
            ['id' => 9903, 'name' => 'Jul-Dec 2024'],
            ['id' => 9904, 'name' => 'Jan-Jun 2024'],
        ];

        // Track previous scores per employee for trend feature
        $prevScores = [];

        foreach ($simulatedPeriods as $period) {
            foreach ($this->employees as $emp) {
                [$mean, $std] = $this->scoreProfiles[$emp['position']] ?? [3.5, 0.5];

                // Employee-level score for this period (their overall rating)
                $empScore = $this->clamp($this->gaussianRandom($mean, $std), 1.0, 5.0);

                $prevScore  = $prevScores[$emp['id']] ?? null;
                $workload   = rand(2, min(count($this->indicators), 5));
                $flagged    = $empScore < 3.0 && rand(0, 100) < 40;

                foreach ($this->indicators as $ind) {
                    // Indicator-level score varies around employee's period score
                    $score = $this->clamp($this->gaussianRandom($empScore, 0.2), 1.0, 5.0);
                    $score = round($score * 4) / 4; // round to nearest 0.25 (CSC scoring)

                    $adjectival = $this->toAdjectival($score);

                    $rows[] = [
                        'employee_id'                 => $emp['id'],
                        'performance_period_id'       => $period['id'] <= 9900 ? $period['id'] : null,
                        'ipcr_id'                     => null,
                        'uwp_success_indicator_id'    => $ind['id'],

                        // Employee context
                        'position'                    => $emp['position'],
                        'office_name'                 => $emp['office_name'],

                        // Indicator context
                        'indicator_text'              => $ind['text'],
                        'function_type'               => $ind['function_type'],
                        'mfo_title'                   => $ind['mfo_title'],
                        'target_quantity'             => $ind['qty'],
                        'target_timeline_days'        => $ind['timeline_days'],

                        // Office/workload context
                        'office_size'                 => $emp['office_size'],
                        'employee_count_assigned'     => rand(1, $emp['office_size']),
                        'current_workload_count'      => $workload,

                        // Trend
                        'previous_final_score'        => $prevScore ? round($prevScore * 4) / 4 : null,
                        'previous_adjectival_rating'  => $prevScore ? $this->toAdjectival($prevScore) : null,

                        // Calibration
                        'was_flagged_for_calibration' => $flagged,

                        // Outcome (ML label)
                        'final_score'                 => $score,
                        'adjectival_rating'           => $adjectival,
                        'feasibility_label'           => $this->toFeasibility($score),

                        'created_at'                  => $now,
                        'updated_at'                  => $now,
                    ];
                }

                $prevScores[$emp['id']] = $empScore;
            }
        }

        // Insert in chunks
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('employee_performance_snapshots')->insert($chunk);
        }

        $this->command->info('ML training data seeded: ' . count($rows) . ' snapshot rows.');
    }

    private function toAdjectival(float $score): string
    {
        if ($score >= 4.5) return 'Outstanding';
        if ($score >= 3.5) return 'Very Satisfactory';
        if ($score >= 2.5) return 'Satisfactory';
        if ($score >= 1.5) return 'Unsatisfactory';
        return 'Poor';
    }

    private function toFeasibility(float $score): string
    {
        if ($score >= 4.0) return 'achievable';
        if ($score >= 3.0) return 'at_risk';
        return 'unrealistic';
    }

    private function clamp(float $val, float $min, float $max): float
    {
        return max($min, min($max, $val));
    }

    /**
     * Box-Muller transform for normally distributed random numbers.
     */
    private function gaussianRandom(float $mean, float $std): float
    {
        $u1 = 1.0 - (mt_rand() / mt_getrandmax());
        $u2 = 1.0 - (mt_rand() / mt_getrandmax());
        $z  = sqrt(-2.0 * log($u1)) * cos(2.0 * M_PI * $u2);
        return $mean + $z * $std;
    }
}
