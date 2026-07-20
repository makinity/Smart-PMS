<?php

namespace App\Services;

use App\Models\Ipcr;
use App\Models\Opcr;
use App\Models\PerformancePeriod;
use App\Models\TopPerformer;
use Illuminate\Support\Collection;

class StageFourPerformerService
{
    private const TOP_RATINGS = ['Outstanding', 'Very Satisfactory', 'Satisfactory'];
    private const LOW_RATINGS = ['Unsatisfactory', 'Poor'];

    public function getTopAndLowPerformers(?PerformancePeriod $period): array
    {
        return $this->groupPerformerRows(
            $this->buildEmployeeRows($period),
            $this->buildOfficeRows($period)
        );
    }

    public function syncTopPerformers(?PerformancePeriod $period): void
    {
        if (! $period) {
            return;
        }

        $data = $this->getTopAndLowPerformers($period);
        $topEmployees = $data['top_employees']->values();
        $topOffices = $data['top_offices']->values();

        $validEmployeeSourceIds = [];
        foreach ($topEmployees as $index => $row) {
            $rank = $index + 1;
            $validEmployeeSourceIds[] = (int) $row['id'];

            TopPerformer::query()->updateOrCreate(
                [
                    'performer_type' => TopPerformer::TYPE_EMPLOYEE,
                    'source_record_id' => (int) $row['id'],
                    'performance_period_id' => $period->id,
                ],
                [
                    'ipcr_id' => (int) $row['id'],
                    'opcr_id' => null,
                    'employee_id' => ((int) ($row['employee_id'] ?? 0)) ?: null,
                    'office_id' => ((int) ($row['office_id'] ?? 0)) ?: null,
                    'rank' => $rank,
                    'performer_name' => $row['employee_name'],
                    'surname' => $row['surname'],
                    'given_name' => $row['given_name'],
                    'middle_name' => $row['middle_name'],
                    'name_extension' => $row['name_extension'],
                    'designation' => $row['designation'],
                    'office_name' => $row['office_name'],
                    'department_head_name' => null,
                    'official_score' => $row['official_score'],
                    'official_rating' => $row['official_rating'],
                    'remarks' => $row['remarks'],
                    'released_at' => $row['released_at'],
                ]
            );
        }

        TopPerformer::query()
            ->where('performance_period_id', $period->id)
            ->where('performer_type', TopPerformer::TYPE_EMPLOYEE)
            ->when(
                !empty($validEmployeeSourceIds),
                fn ($query) => $query->whereNotIn('source_record_id', $validEmployeeSourceIds),
                fn ($query) => $query
            )
            ->delete();

        $validOfficeSourceIds = [];
        foreach ($topOffices as $index => $row) {
            $rank = $index + 1;
            $validOfficeSourceIds[] = (int) $row['id'];

            TopPerformer::query()->updateOrCreate(
                [
                    'performer_type' => TopPerformer::TYPE_OFFICE,
                    'source_record_id' => (int) $row['id'],
                    'performance_period_id' => $period->id,
                ],
                [
                    'ipcr_id' => null,
                    'opcr_id' => (int) $row['id'],
                    'employee_id' => null,
                    'office_id' => ((int) ($row['office_id'] ?? 0)) ?: null,
                    'rank' => $rank,
                    'performer_name' => $row['office_name'],
                    'surname' => null,
                    'given_name' => null,
                    'middle_name' => null,
                    'name_extension' => null,
                    'designation' => null,
                    'office_name' => $row['office_name'],
                    'department_head_name' => $row['department_head_name'],
                    'official_score' => $row['official_score'],
                    'official_rating' => $row['official_rating'],
                    'remarks' => $row['remarks'] ?? 'Released Stage III result',
                    'released_at' => $row['released_at'],
                ]
            );
        }

        TopPerformer::query()
            ->where('performance_period_id', $period->id)
            ->where('performer_type', TopPerformer::TYPE_OFFICE)
            ->when(
                !empty($validOfficeSourceIds),
                fn ($query) => $query->whereNotIn('source_record_id', $validOfficeSourceIds),
                fn ($query) => $query
            )
            ->delete();
    }

    public function getPersistedTopPerformers(?PerformancePeriod $period): array
    {
        if (! $period) {
            return [
                'top_employees' => collect(),
                'top_offices' => collect(),
                'low_employees' => collect(),
                'low_offices' => collect(),
                'summary_counts' => [
                    'top_employees' => 0,
                    'top_offices' => 0,
                    'low_employees' => 0,
                    'low_offices' => 0,
                ],
            ];
        }

        $rows = TopPerformer::query()
            ->where('performance_period_id', $period->id)
            ->orderBy('performer_type')
            ->orderBy('rank')
            ->get();

        $topEmployees = $rows
            ->where('performer_type', TopPerformer::TYPE_EMPLOYEE)
            ->values()
            ->map(fn (TopPerformer $row) => $this->mapPersistedRow($row));

        $topOffices = $rows
            ->where('performer_type', TopPerformer::TYPE_OFFICE)
            ->values()
            ->map(fn (TopPerformer $row) => $this->mapPersistedRow($row));

        return [
            'top_employees' => $topEmployees,
            'top_offices' => $topOffices,
            'low_employees' => collect(),
            'low_offices' => collect(),
            'summary_counts' => [
                'top_employees' => $topEmployees->count(),
                'top_offices' => $topOffices->count(),
                'low_employees' => 0,
                'low_offices' => 0,
            ],
        ];
    }

    public function groupPerformerRows(Collection $employeeRows, Collection $officeRows): array
    {
        $topEmployees = $employeeRows
            ->filter(fn (array $row) => in_array($row['official_rating'], self::TOP_RATINGS, true))
            ->sortByDesc('official_score')
            ->values();

        $lowEmployees = $employeeRows
            ->filter(fn (array $row) => in_array($row['official_rating'], self::LOW_RATINGS, true))
            ->sortBy('official_score')
            ->values();

        $topOffices = $officeRows
            ->filter(fn (array $row) => in_array($row['official_rating'], self::TOP_RATINGS, true))
            ->sortByDesc('official_score')
            ->values();

        $lowOffices = $officeRows
            ->filter(fn (array $row) => in_array($row['official_rating'], self::LOW_RATINGS, true))
            ->sortBy('official_score')
            ->values();

        return [
            'top_employees' => $topEmployees,
            'top_offices' => $topOffices,
            'low_employees' => $lowEmployees,
            'low_offices' => $lowOffices,
            'summary_counts' => [
                'top_employees' => $topEmployees->count(),
                'top_offices' => $topOffices->count(),
                'low_employees' => $lowEmployees->count(),
                'low_offices' => $lowOffices->count(),
            ],
        ];
    }

    public function resolveEmployeeRow(Ipcr $ipcr): ?array
    {
        $officialScore = $ipcr->pmt_adjusted_score !== null
            ? (float) $ipcr->pmt_adjusted_score
            : (is_numeric($ipcr->final_score) ? (float) $ipcr->final_score : null);
        $officialRating = trim((string) ($ipcr->pmt_adjusted_rating ?: $ipcr->adjectival_rating));

        if ($officialScore === null || $officialRating === '') {
            return null;
        }

        $nameParts = $this->splitNameParts((string) ($ipcr->employee?->name ?? '--'));

        return [
            'id' => (int) $ipcr->id,
            'employee_id' => (int) ($ipcr->employee_id ?? 0),
            'office_id' => (int) ($ipcr->employee?->office_id ?? $ipcr->office_id ?? 0),
            'employee_name' => (string) ($ipcr->employee?->name ?? '--'),
            'surname' => $nameParts['surname'],
            'given_name' => $nameParts['given_name'],
            'middle_name' => $nameParts['middle_name'],
            'name_extension' => $nameParts['name_extension'],
            'designation' => (string) ($ipcr->employee?->position ?? '--'),
            'office_name' => (string) ($ipcr->employee?->office?->name ?? $ipcr->office?->name ?? '--'),
            'period_name' => (string) ($ipcr->performancePeriod?->name ?? '--'),
            'official_score' => round($officialScore, 2),
            'official_rating' => $officialRating,
            'remarks' => 'Released Stage III result',
            'released_at' => $ipcr->released_at,
        ];
    }

    public function resolveOfficeRow(Opcr $opcr): ?array
    {
        $officialScore = $opcr->pmt_adjusted_score !== null
            ? (float) $opcr->pmt_adjusted_score
            : (is_numeric($opcr->final_score) ? (float) $opcr->final_score : null);
        $officialRating = trim((string) ($opcr->pmt_adjusted_rating ?: $opcr->adjectival_rating));

        if ($officialScore === null || $officialRating === '') {
            return null;
        }

        return [
            'id' => (int) $opcr->id,
            'office_id' => (int) ($opcr->office_id ?? 0),
            'office_name' => (string) ($opcr->office?->name ?? '--'),
            'department_head_name' => (string) ($opcr->office?->head?->name ?? '--'),
            'period_name' => (string) ($opcr->performancePeriod?->name ?? '--'),
            'official_score' => round($officialScore, 2),
            'official_rating' => $officialRating,
            'remarks' => 'Released Stage III result',
            'released_at' => $opcr->released_at,
        ];
    }

    private function buildEmployeeRows(?PerformancePeriod $period): Collection
    {
        $query = Ipcr::query()
            ->with([
                'employee:id,name',
                'employee.employee.office:id,name',
                'performancePeriod:id,name',
            ])
            ->where('status', Ipcr::STATUS_RELEASED_BY_PMT);

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        return $query->get()
            ->map(fn (Ipcr $ipcr) => $this->resolveEmployeeRow($ipcr))
            ->filter()
            ->values();
    }

    private function buildOfficeRows(?PerformancePeriod $period): Collection
    {
        $query = Opcr::query()
            ->with([
                'office.head:id,name',
                'performancePeriod:id,name',
            ])
            ->where('status', Opcr::STATUS_RELEASED_BY_PMT);

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        return $query->get()
            ->map(fn (Opcr $opcr) => $this->resolveOfficeRow($opcr))
            ->filter()
            ->values();
    }

    private function splitNameParts(string $fullName): array
    {
        $fullName = trim(preg_replace('/\s+/', ' ', $fullName) ?? $fullName);
        if ($fullName === '' || $fullName === '--') {
            return [
                'surname' => '--',
                'given_name' => '--',
                'middle_name' => '--',
                'name_extension' => '--',
            ];
        }

        $tokens = preg_split('/\s+/', $fullName) ?: [];
        $extensions = ['JR', 'SR', 'II', 'III', 'IV', 'V'];
        $extension = '';

        $lastToken = strtoupper(rtrim((string) end($tokens), '.'));
        if (in_array($lastToken, $extensions, true)) {
            $extension = array_pop($tokens) ?: '';
        }

        $tokenCount = count($tokens);
        if ($tokenCount === 1) {
            return [
                'surname' => $tokens[0],
                'given_name' => '--',
                'middle_name' => '--',
                'name_extension' => $extension !== '' ? $extension : '--',
            ];
        }

        $surname = (string) array_pop($tokens);
        $givenName = (string) array_shift($tokens);
        $middleName = !empty($tokens) ? implode(' ', $tokens) : '--';

        return [
            'surname' => $surname !== '' ? $surname : '--',
            'given_name' => $givenName !== '' ? $givenName : '--',
            'middle_name' => $middleName !== '' ? $middleName : '--',
            'name_extension' => $extension !== '' ? $extension : '--',
        ];
    }

    private function mapPersistedRow(TopPerformer $row): array
    {
        return [
            'id' => (int) $row->source_record_id,
            'performer_type' => (string) $row->performer_type,
            'rank' => (int) ($row->rank ?? 0),
            'employee_name' => (string) ($row->performer_name ?? '--'),
            'employee_id' => (int) ($row->employee_id ?? 0),
            'office_id' => (int) ($row->office_id ?? 0),
            'performer_name' => (string) ($row->performer_name ?? '--'),
            'surname' => (string) ($row->surname ?? '--'),
            'given_name' => (string) ($row->given_name ?? '--'),
            'middle_name' => (string) ($row->middle_name ?? '--'),
            'name_extension' => (string) ($row->name_extension ?? '--'),
            'designation' => (string) ($row->designation ?? '--'),
            'office_name' => (string) ($row->office_name ?? '--'),
            'department_head_name' => (string) ($row->department_head_name ?? '--'),
            'period_name' => (string) ($row->performancePeriod?->name ?? '--'),
            'official_score' => round((float) $row->official_score, 2),
            'official_rating' => (string) $row->official_rating,
            'remarks' => (string) ($row->remarks ?? '--'),
            'released_at' => $row->released_at,
        ];
    }
}
