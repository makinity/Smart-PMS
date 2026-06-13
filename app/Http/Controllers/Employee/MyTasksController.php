<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MyTasksController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $period = PerformancePeriod::current();

        $search = trim((string) $request->string('search'));
        $status = trim((string) $request->string('status')) ?: 'all';
        $perPage = 8;

        $baseQuery = OrsEntry::query()
            ->where('employee_id', $user->id)
            ->with([
                'ipcrItem.indicator.uwpMfo',
                'supervisor.office',
                'evidences',
                'monitoring.supervisor',
            ]);

        if ($period) {
            $baseQuery->where('performance_period_id', $period->id);
        } else {
            $baseQuery->whereRaw('1 = 0');
        }

        $this->applySearch($baseQuery, $search);
        $this->applyStatusFilter($baseQuery, $status);

        $tasks = $baseQuery
            ->orderByDesc('updated_at')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (OrsEntry $entry) => $this->formatEntry($entry));

        $summaryQuery = OrsEntry::query()
            ->where('employee_id', $user->id);

        if ($period) {
            $summaryQuery->where('performance_period_id', $period->id);
        } else {
            $summaryQuery->whereRaw('1 = 0');
        }

        $statusCounts = (clone $summaryQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $summary = [
            'total' => (clone $summaryQuery)->count(),
            'draft' => (int) ($statusCounts['draft'] ?? 0),
            'recording' => (int) ($statusCounts['recording'] ?? 0),
            'paused' => (int) ($statusCounts['paused'] ?? 0),
            'submitted' => (int) ($statusCounts['submitted'] ?? 0),
            'rated' => (int) ($statusCounts['rated'] ?? 0),
        ];

        return Inertia::render('Employee/MyTask/Index', [
            'tasks' => $tasks,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'summary' => $summary,
            'statusCounts' => $statusCounts,
            'periodName' => $period?->name,
            'notice' => $period ? null : 'No active performance period is currently available.',
            'autoOpenEntryId' => $request->integer('ors_entry_id') ?: null,
        ]);
    }

    private function applySearch(Builder $query, string $search): void
    {
        if ($search === '') {
            return;
        }

        $term = '%' . str_replace('%', '\\%', $search) . '%';

        $query->where(function (Builder $builder) use ($term) {
            $builder
                ->where('quantity', 'like', $term)
                ->orWhere('notes', 'like', $term)
                ->orWhereHas('supervisor', fn (Builder $supervisor) => $supervisor->where('name', 'like', $term))
                ->orWhereHas('ipcrItem.indicator', function (Builder $indicator) use ($term) {
                    $indicator
                        ->where('indicator_text', 'like', $term)
                        ->orWhere('target_quantity', 'like', $term)
                        ->orWhere('target_timeline', 'like', $term)
                        ->orWhereHas('uwpMfo', fn (Builder $mfo) => $mfo->where('title', 'like', $term));
                });
        });
    }

    private function applyStatusFilter(Builder $query, string $status): void
    {
        if ($status === '' || $status === 'all') {
            return;
        }

        $query->where('status', $status);
    }

    private function formatEntry(OrsEntry $entry): array
    {
        $monitoring = $entry->monitoring->first();

        return [
            'id' => $entry->id,
            'work_date' => $entry->work_date?->toDateString(),
            'status' => $entry->status,
            'quantity' => $entry->quantity,
            'notes' => $entry->notes,
            'total_seconds' => (int) ($entry->total_seconds ?? 0),
            'started_at' => $entry->started_at?->toIso8601String(),
            'stopped_at' => $entry->stopped_at?->toIso8601String(),
            'submitted_at' => $entry->submitted_at?->toIso8601String(),
            'locked_at' => $entry->locked_at?->toIso8601String(),
            'last_updated_at' => $entry->updated_at?->toIso8601String(),
            'output_title' => $entry->ipcrItem?->indicator?->uwpMfo?->title ?? '—',
            'indicator_text' => $entry->ipcrItem?->indicator?->indicator_text ?? '—',
            'supervisor_name' => $entry->supervisor?->name ?? '—',
            'supervisor_office' => $entry->supervisor?->office?->name,
            'evidence_count' => $entry->evidences->count(),
            'evidences' => $entry->evidences->map(fn ($ev) => [
                'id' => $ev->id,
                'file_name' => $ev->file_name,
                'file_path' => asset('storage/' . $ev->file_path),
                'mime_type' => $ev->mime_type,
                'file_size' => $ev->file_size,
                'uploaded_at' => $ev->uploaded_at?->toIso8601String(),
            ])->toArray(),
            'rating' => $monitoring ? [
                'quality_rating' => $monitoring->quality_rating,
                'timeliness_rating' => $monitoring->timeliness_rating,
                'remarks' => $monitoring->remarks,
                'rated_at' => $monitoring->rated_at?->toIso8601String(),
                'reviewer_name' => $monitoring->supervisor?->name ?? $entry->supervisor?->name ?? '—',
            ] : null,
        ];
    }
}
