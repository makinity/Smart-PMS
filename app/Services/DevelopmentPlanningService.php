<?php

namespace App\Services;

use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\PerformancePeriod;
use Illuminate\Support\Collection;

class DevelopmentPlanningService
{
    private const LOW_RATINGS = ['Unsatisfactory', 'Poor'];

    public function __construct(
        private readonly StageFourPerformerService $performerService
    ) {
    }

    public function getLowPerformerCandidates(?PerformancePeriod $period): Collection
    {
        $query = Ipcr::query()
            ->with([
                'employee:id,name,office_id,position',
                'employee.office:id,name',
                'office:id,name',
                'performancePeriod:id,name',
            ])
            ->where('status', Ipcr::STATUS_RELEASED_BY_PMT);

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        $ipcrs = $query->get();

        $plans = DevelopmentPlan::query()
            ->when($period, fn ($q) => $q->where('performance_period_id', $period->id))
            ->get()
            ->keyBy('ipcr_id');

        return $this->buildCandidateRows($ipcrs, $plans);
    }

    public function getPersistedDevelopmentPlans(?PerformancePeriod $period): Collection
    {
        $query = DevelopmentPlan::query()
            ->with([
                'employee.office:id,name',
                'office.head:id,name',
                'performancePeriod:id,name',
                'creator:id,name',
                'updater:id,name',
            ])
            ->orderByDesc('performance_period_id')
            ->orderBy('status')
            ->orderBy('employee_id');

        if ($period) {
            $query->where('performance_period_id', $period->id);
        }

        return $this->mapPersistedDevelopmentPlans($query->get());
    }

    public function buildCandidateRows(Collection $ipcrs, Collection $plans): Collection
    {
        return $ipcrs
            ->map(function (Ipcr $ipcr) use ($plans) {
                $row = $this->performerService->resolveEmployeeRow($ipcr);
                if (!$row || !in_array($row['official_rating'], self::LOW_RATINGS, true)) {
                    return null;
                }

                $plan = $plans->get($ipcr->id);

                return [
                    'ipcr_id' => (int) $ipcr->id,
                    'employee_id' => (int) ($ipcr->employee_id ?? 0),
                    'employee_name' => $row['employee_name'],
                    'office_name' => $row['office_name'],
                    'position' => (string) ($ipcr->employee?->position ?? '--'),
                    'period_name' => $row['period_name'],
                    'official_score' => $row['official_score'],
                    'official_rating' => $row['official_rating'],
                    'released_at' => $row['released_at'],
                    'development_plan_id' => $plan?->id,
                    'development_plan_status' => (string) ($plan?->status ?? ''),
                    'development_plan_status_label' => $this->formatStatusLabel((string) ($plan?->status ?? '')),
                    'lnd_sync_status' => (string) ($plan?->lnd_sync_status ?? DevelopmentPlan::LND_SYNC_NOT_SENT),
                    'lnd_sync_status_label' => $this->formatLndSyncStatusLabel((string) ($plan?->lnd_sync_status ?? DevelopmentPlan::LND_SYNC_NOT_SENT)),
                    'lnd_reference_id' => $plan?->lnd_reference_id,
                    'lnd_synced_at' => optional($plan?->lnd_synced_at)?->toISOString(),
                    'lnd_last_error' => (string) ($plan?->lnd_last_error ?? ''),
                ];
            })
            ->filter()
            ->sortBy('official_score')
            ->values();
    }

    public function summaryCounts(Collection $candidates, Collection $lowOffices): array
    {
        return [
            'low_employees' => $candidates->count(),
            'low_offices' => $lowOffices->count(),
            'drafts_created' => $candidates->filter(fn (array $row) => ($row['development_plan_status'] ?? '') === DevelopmentPlan::STATUS_DRAFT)->count(),
            'pending_details' => $candidates->filter(fn (array $row) => ($row['development_plan_status'] ?? '') === DevelopmentPlan::STATUS_PENDING_DETAILS)->count(),
        ];
    }

    public function formatStatusLabel(string $status): string
    {
        return match ($status) {
            DevelopmentPlan::STATUS_DRAFT => 'Draft',
            DevelopmentPlan::STATUS_PENDING_DETAILS => 'Pending Details',
            DevelopmentPlan::STATUS_SUBMITTED_TO_LD => 'Submitted to L&D',
            default => 'No Draft Yet',
        };
    }

    public function mapPersistedDevelopmentPlans(Collection $plans): Collection
    {
        return $plans
            ->map(function (DevelopmentPlan $plan) {
                return [
                    'id' => (int) $plan->id,
                    'ipcr_id' => (int) $plan->ipcr_id,
                    'employee_id' => (int) $plan->employee_id,
                    'office_id' => (int) $plan->office_id,
                    'performance_period_id' => (int) $plan->performance_period_id,
                    'performance_period_name' => (string) ($plan->performancePeriod?->name ?? '--'),
                    'employee_name' => (string) ($plan->employee?->name ?? '--'),
                    'office_name' => (string) ($plan->employee?->office?->name ?? $plan->office?->name ?? '--'),
                    'department_head_name' => (string) ($plan->office?->head?->name ?? '--'),
                    'designation' => (string) ($plan->employee?->position ?? '--'),
                    'source_score' => round((float) $plan->source_score, 2),
                    'source_rating' => (string) $plan->source_rating,
                    'status' => (string) $plan->status,
                    'status_label' => $this->formatStatusLabel((string) $plan->status),
                    'pmt_remarks' => (string) ($plan->pmt_remarks ?? ''),
                    'created_by_name' => (string) ($plan->creator?->name ?? '--'),
                    'updated_by_name' => (string) ($plan->updater?->name ?? '--'),
                    'submitted_to_ld_at' => optional($plan->submitted_to_ld_at)?->toISOString(),
                    'lnd_sync_status' => (string) ($plan->lnd_sync_status ?? DevelopmentPlan::LND_SYNC_NOT_SENT),
                    'lnd_sync_status_label' => $this->formatLndSyncStatusLabel((string) ($plan->lnd_sync_status ?? DevelopmentPlan::LND_SYNC_NOT_SENT)),
                    'lnd_reference_id' => $plan->lnd_reference_id,
                    'lnd_synced_at' => optional($plan->lnd_synced_at)?->toISOString(),
                    'lnd_last_error' => (string) ($plan->lnd_last_error ?? ''),
                    'created_at' => optional($plan->created_at)?->toISOString(),
                    'updated_at' => optional($plan->updated_at)?->toISOString(),
                ];
            })
            ->values();
    }

    public function formatLndSyncStatusLabel(string $status): string
    {
        return match (strtolower(trim($status))) {
            DevelopmentPlan::LND_SYNC_SENT => 'Sent',
            DevelopmentPlan::LND_SYNC_ACKNOWLEDGED => 'Acknowledged',
            DevelopmentPlan::LND_SYNC_FAILED => 'Failed',
            default => 'Not Sent',
        };
    }
}
