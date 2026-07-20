<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\DevelopmentPlan;
use App\Models\Ipcr;
use App\Models\Office;
use App\Models\Opcr;
use App\Models\OpcraAccomplishmentSubmission;
use App\Models\PerformancePeriod;
use App\Models\UnitWorkPlan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OfficeController extends Controller
{
    public function index(Request $request)
    {
        $filters = [
            'search' => trim((string) $request->input('search', '')),
            'filter' => $request->input('filter', 'all'),
        ];

        $offices = Office::query()
            ->with(['head:id,name,email'])
            ->withCount([
                'employeeRecords as employees_count' => fn ($q) => $q->whereHas('user', fn ($uq) => $uq->where('role', 'employee')),
                'employeeRecords as supervisors_count' => fn ($q) => $q->whereHas('user', fn ($uq) => $uq->where('role', 'supervisor')),
            ])
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->when($filters['filter'], function ($query, $filter) {
                return match ($filter) {
                    'active' => $query->where('is_active', true),
                    'inactive' => $query->where('is_active', false),
                    'hris' => $query->whereNotNull('hris_id'),
                    default => $query,
                };
            })
            ->orderBy('name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Office $office) => [
                'id' => $office->id,
                'name' => $office->name,
                'code' => $office->code,
                'is_active' => (bool) $office->is_active,
                'hris_id' => $office->hris_id,
                'hris_synced_at' => $office->hris_synced_at?->toDateTimeString(),
                'employees_count' => $office->employees_count,
                'supervisors_count' => $office->supervisors_count,
                'head' => $office->head ? [
                    'id'                => $office->head->id,
                    'name'              => $office->head->name,
                    'position'          => $office->head->position,
                    'profile_photo_url' => $office->head->profile_photo_url,
                ] : null,
            ]);

        return Inertia::render('Admin/Offices/Index', [
            'offices' => $offices,
            'filters' => $filters,
            'heads' => $this->headOptions(),
            'stats' => [
                'total' => Office::count(),
                'active' => Office::where('is_active', true)->count(),
                'inactive' => Office::where('is_active', false)->count(),
                'hris' => Office::whereNotNull('hris_id')->count(),
            ],
        ]);
    }

    public function show(Request $request, Office $office)
    {
        $office->loadCount([
            'employeeRecords as employees_count' => fn ($q) => $q->whereHas('user', fn ($uq) => $uq->where('role', 'employee')),
            'employeeRecords as supervisors_count' => fn ($q) => $q->whereHas('user', fn ($uq) => $uq->where('role', 'supervisor')),
        ]);
        $office->load(['head:id,name,email']);

        $currentPeriod = PerformancePeriod::current();

        // ── People ───────────────────────────────────────────────────────────
        $supervisors = User::query()
            ->whereHas('employee', fn ($q) => $q->where('office_id', $office->id))
            ->where('role', 'supervisor')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => [
                'id'                => $u->id,
                'name'              => $u->name,
                'position'          => $u->employee?->position,
                'email'             => $u->email,
                'profile_photo_url' => $u->employee?->profile_photo_url ?? \Illuminate\Support\Facades\Storage::url('profiles/default.jpeg'),
                'manages_count'     => User::whereHas('employee', fn ($q) => $q->where('office_id', $office->id))->where('role', 'employee')->count(),
            ]);

        $empSearch = trim((string) $request->input('emp_search', ''));

        $employeesPaginator = User::query()
            ->whereHas('employee', fn ($q) => $q->where('office_id', $office->id))
            ->where('role', 'employee')
            ->when($empSearch, function ($q, $term) {
                $q->where(function ($w) use ($term) {
                    $w->where('name', 'like', "%{$term}%")
                        ->orWhereHas('employee', fn ($eq) => $eq->where('position', 'like', "%{$term}%"));
                });
            })
            ->with('employee')
            ->orderBy('name')
            ->paginate(10, ['id', 'name', 'email'], 'emp_page')
            ->withQueryString();

        // Latest IPCR score/adjectival per employee on this page
        $employeeIds = collect($employeesPaginator->items())->pluck('id')->all();
        $latestIpcr = $this->latestIpcrFor($employeeIds);

        $employeesPaginator->through(fn (User $u) => [
            'id'                => $u->id,
            'name'              => $u->name,
            'position'          => $u->employee?->position,
            'email'             => $u->email,
            'profile_photo_url' => $u->employee?->profile_photo_url ?? \Illuminate\Support\Facades\Storage::url('profiles/default.jpeg'),
            'ipcr_score'        => $latestIpcr[$u->id]['score'] ?? null,
            'ipcr_adjectival'   => $latestIpcr[$u->id]['adjectival'] ?? null,
        ]);

        // ── History ──────────────────────────────────────────────────────────
        $history = $this->buildHistory($office);

        // ── Stats ────────────────────────────────────────────────────────────
        $latestRating = OpcraAccomplishmentSubmission::where('office_id', $office->id)
            ->whereNotNull('final_office_rating')
            ->orderByDesc('performance_period_id')
            ->first();

        $currentOpcr = $currentPeriod
            ? Opcr::where('office_id', $office->id)
                ->where('performance_period_id', $currentPeriod->id)
                ->first()
            : null;

        $activeUwp = $currentPeriod
            ? UnitWorkPlan::where('office_id', $office->id)
                ->where('performance_period_id', $currentPeriod->id)
                ->count()
            : 0;

        $stats = [
            'total_employees' => $office->employees_count,
            'active_uwp' => $activeUwp,
            'opcr_status' => $currentOpcr?->status,
            'latest_rating' => $latestRating?->final_office_rating,
            'latest_adjectival' => $latestRating?->final_adjectival_rating,
        ];

        return Inertia::render('Admin/Offices/Show', [
            'office' => [
                'id' => $office->id,
                'name' => $office->name,
                'code' => $office->code,
                'is_active' => (bool) $office->is_active,
                'hris_id' => $office->hris_id,
                'hris_synced_at' => $office->hris_synced_at?->toDateTimeString(),
                'created_at' => $office->created_at?->toDateTimeString(),
                'head_id' => $office->head_id,
                'employees_count' => $office->employees_count,
                'supervisors_count' => $office->supervisors_count,
                'head' => $office->head ? [
                    'id' => $office->head->id,
                    'name' => $office->head->name,
                    'position' => $office->head->position,
                    'email' => $office->head->email,
                    'profile_photo_url' => $office->head->profile_photo_url,
                ] : null,
                'has_records' => $this->hasRelatedRecords($office),
            ],
            'people' => [
                'supervisors' => $supervisors,
                'employees' => $employeesPaginator,
            ],
            'history' => $history,
            'stats' => $stats,
            'heads' => $this->headOptions(),
            'filters' => ['emp_search' => $empSearch],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('offices', 'name')],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('offices', 'code')],
            'head_id' => ['nullable', 'exists:users,id'],
        ]);

        Office::create([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'head_id' => $data['head_id'] ?? null,
            'is_active' => true,
        ]);

        return back()->with('success', 'Office created successfully.');
    }

    public function update(Request $request, Office $office)
    {
        // HRIS-sourced offices have read-only name/code — reject any change to them.
        if ($office->hris_id
            && ($request->input('name') !== $office->name || $request->input('code') !== $office->code)) {
            return back()->withErrors([
                'name' => 'Name and code are managed by HRIS and cannot be edited.',
            ])->with('error', 'Name and code are managed by HRIS and cannot be edited.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('offices', 'name')->ignore($office->id)],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('offices', 'code')->ignore($office->id)],
            'head_id' => ['nullable', 'exists:users,id'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $office->fill([
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'head_id' => $data['head_id'] ?? null,
        ]);

        if ($request->has('is_active')) {
            $office->is_active = (bool) $data['is_active'];
        }

        $office->save();

        return back()->with('success', 'Office updated successfully.');
    }

    public function destroy(Office $office)
    {
        if ($this->hasRelatedRecords($office)) {
            return back()->with('error', 'Cannot delete — this office still has people or records attached.');
        }

        $office->delete();

        return redirect()
            ->route('admin.offices.index')
            ->with('success', 'Office deleted successfully.');
    }

    public function toggleStatus(Office $office)
    {
        $office->is_active = ! $office->is_active;
        $office->save();

        return back()->with('success', $office->is_active ? 'Office activated.' : 'Office deactivated.');
    }

    public function exportHistory(Office $office): StreamedResponse
    {
        $history = $this->buildHistory($office);

        $filename = 'office-'.($office->code ?: $office->id).'-history.csv';

        return response()->streamDownload(function () use ($history) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Period', 'UWP Status', 'OPCR Status', 'Office Rating', 'Adjectival', 'Dev Plans', 'Employees Rated']);
            foreach ($history as $row) {
                fputcsv($out, [
                    $row['period'],
                    $row['uwp_status'] ?? '',
                    $row['opcr_status'] ?? '',
                    $row['office_rating'] ?? '',
                    $row['office_adjectival'] ?? '',
                    $row['dev_plans'],
                    count($row['employees']),
                ]);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function headOptions()
    {
        return User::query()
            ->whereIn('role', ['dept-head'])
            ->orderBy('name')
            ->get(['id', 'name', 'position', 'role'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'position' => $u->position,
            ]);
    }

    private function hasRelatedRecords(Office $office): bool
    {
        return \App\Models\Employee::where('office_id', $office->id)->exists()
            || UnitWorkPlan::where('office_id', $office->id)->exists()
            || Opcr::where('office_id', $office->id)->exists();
    }

    private function latestIpcrFor(array $employeeIds): array
    {
        if (empty($employeeIds)) {
            return [];
        }

        $rows = Ipcr::query()
            ->whereIn('employee_id', $employeeIds)
            ->orderByDesc('performance_period_id')
            ->orderByDesc('id')
            ->get(['id', 'employee_id', 'final_score', 'adjectival_rating', 'pmt_adjusted_score', 'pmt_adjusted_rating']);

        $latest = [];
        foreach ($rows as $row) {
            if (isset($latest[$row->employee_id])) {
                continue;
            }
            $latest[$row->employee_id] = [
                'score' => $row->pmt_adjusted_score ?? $row->final_score,
                'adjectival' => $row->pmt_adjusted_rating ?: $row->adjectival_rating,
            ];
        }

        return $latest;
    }

    private function buildHistory(Office $office): array
    {
        $periods = PerformancePeriod::orderByDesc('start_date')->get();

        $uwps = UnitWorkPlan::where('office_id', $office->id)
            ->get(['id', 'performance_period_id', 'status'])
            ->keyBy('performance_period_id');

        $opcrs = Opcr::where('office_id', $office->id)
            ->get(['id', 'performance_period_id', 'status'])
            ->keyBy('performance_period_id');

        $ratings = OpcraAccomplishmentSubmission::where('office_id', $office->id)
            ->get(['id', 'performance_period_id', 'final_office_rating', 'final_adjectival_rating'])
            ->keyBy('performance_period_id');

        $devPlanCounts = DevelopmentPlan::where('office_id', $office->id)
            ->select('performance_period_id', DB::raw('count(*) as aggregate'))
            ->groupBy('performance_period_id')
            ->pluck('aggregate', 'performance_period_id');

        $employeeRatings = AccomplishmentSubmission::where('office_id', $office->id)
            ->with('employee:id,name')
            ->get(['id', 'employee_id', 'performance_period_id', 'final_rating', 'final_adjectival_rating'])
            ->groupBy('performance_period_id');

        $history = [];

        foreach ($periods as $period) {
            $hasData = $uwps->has($period->id)
                || $opcrs->has($period->id)
                || $ratings->has($period->id)
                || ($devPlanCounts[$period->id] ?? 0) > 0
                || $employeeRatings->has($period->id);

            if (! $hasData) {
                continue;
            }

            $employees = ($employeeRatings[$period->id] ?? collect())
                ->map(fn (AccomplishmentSubmission $s) => [
                    'name' => $s->employee?->name ?? 'Unknown',
                    'score' => $s->final_rating,
                    'adjectival' => $s->final_adjectival_rating,
                ])
                ->values()
                ->all();

            $history[] = [
                'period_id' => $period->id,
                'period' => $period->name,
                'uwp_status' => $uwps[$period->id]->status ?? null,
                'opcr_status' => $opcrs[$period->id]->status ?? null,
                'office_rating' => $ratings[$period->id]->final_office_rating ?? null,
                'office_adjectival' => $ratings[$period->id]->final_adjectival_rating ?? null,
                'dev_plans' => (int) ($devPlanCounts[$period->id] ?? 0),
                'employees' => $employees,
            ];
        }

        return $history;
    }
}
