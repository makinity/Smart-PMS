<?php

namespace App\Http\Controllers\Pmt;

use App\Http\Controllers\Controller;
use App\Models\AccomplishmentSubmission;
use App\Models\Ipcr;
use App\Models\Mpor;
use App\Models\Opcr;
use App\Models\OrsEntry;
use App\Models\PerformancePeriod;
use App\Models\QarHeader;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PerformancePeriodsController extends Controller
{
    public function index()
    {
        $periods = PerformancePeriod::orderByDesc('start_date')->get()->map(fn($p) => [
            'id'         => $p->id,
            'name'       => $p->name,
            'start_date' => $p->start_date->toDateString(),
            'end_date'   => $p->end_date->toDateString(),
            'is_active'  => $p->is_active,
        ]);

        $activePeriod = PerformancePeriod::where('is_active', true)->first();

        return Inertia::render('Pmt/PerformancePeriods/Index', [
            'periods'      => $periods,
            'hasActive'    => $activePeriod !== null,
        ]);
    }

    public function checkPending(PerformancePeriod $performancePeriod)
    {
        return response()->json($this->pendingCounts($performancePeriod));
    }

    public function notifyPending(PerformancePeriod $performancePeriod)
    {
        $pid  = $performancePeriod->id;
        $name = $performancePeriod->name;

        // Employees with unsubmitted ORS or uncommitted IPCR or draft accomplishment
        $employeeIds = collect()
            ->merge(
                OrsEntry::where('performance_period_id', $pid)
                    ->whereIn('status', ['draft', 'recording', 'paused'])
                    ->pluck('employee_id')
            )
            ->merge(
                Ipcr::where('performance_period_id', $pid)
                    ->whereNotIn('status', ['committed', 'released_by_pmt'])
                    ->pluck('employee_id')
            )
            ->merge(
                AccomplishmentSubmission::where('performance_period_id', $pid)
                    ->whereNotIn('status', ['pmt_approved', 'returned_to_employee'])
                    ->whereIn('status', ['draft'])
                    ->pluck('employee_id')
            )
            ->unique();

        // Supervisors with unrated ORS entries
        $supervisorIds = OrsEntry::where('performance_period_id', $pid)
            ->where('status', 'submitted')
            ->pluck('supervisor_id')
            ->unique();

        // Dept heads with accomplishments pending endorsement or unsubmitted QAR
        $deptHeadIds = collect()
            ->merge(
                AccomplishmentSubmission::where('performance_period_id', $pid)
                    ->whereIn('status', ['supervisor_endorsed'])
                    ->pluck('dept_head_id')
                    ->filter()
            )
            ->merge(
                QarHeader::where('performance_period_id', $pid)
                    ->whereNotIn('status', ['submitted', 'pmt_approved'])
                    ->pluck('office_id')
                    ->map(fn($oid) => \App\Models\User::where('office_id', $oid)->where('role', 'dept-head')->value('id'))
                    ->filter()
            )
            ->unique();

        $notif = fn(string $role, string $msg, string $url) =>
            new \App\Notifications\WorkflowEventNotification(
                type: 'alert',
                event: 'period.closing_reminder',
                message: $msg,
                url: $url,
            );

        \App\Models\User::whereIn('id', $employeeIds)->each(fn($u) =>
            $u->notify($notif('employee',
                "The performance period \"{$name}\" is closing. Please complete your pending ORS entries, IPCR, or accomplishment submission.",
                '/employee/ors'
            ))
        );

        \App\Models\User::whereIn('id', $supervisorIds)->each(fn($u) =>
            $u->notify($notif('supervisor',
                "The performance period \"{$name}\" is closing. Please review and rate pending ORS entries from your team.",
                '/supervisor/ors-monitoring'
            ))
        );

        \App\Models\User::whereIn('id', $deptHeadIds)->each(fn($u) =>
            $u->notify($notif('dept-head',
                "The performance period \"{$name}\" is closing. Please complete pending accomplishment endorsements or QAR submissions.",
                '/dept-head/accomplishment-review'
            ))
        );

        return response()->json(['ok' => true]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after:start_date'],
        ]);

        PerformancePeriod::create([...$data, 'is_active' => false]);

        return back()->with('success', 'Performance period created.');
    }

    public function update(Request $request, PerformancePeriod $performancePeriod)
    {
        $data = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after:start_date'],
        ]);

        $performancePeriod->update($data);

        return back()->with('success', 'Performance period updated.');
    }

    public function activate(PerformancePeriod $performancePeriod)
    {
        // Deactivate all others first
        PerformancePeriod::where('id', '!=', $performancePeriod->id)->update(['is_active' => false]);
        $performancePeriod->update(['is_active' => true]);

        return back()->with('success', "{$performancePeriod->name} is now the active period.");
    }

    public function deactivate(PerformancePeriod $performancePeriod)
    {
        $performancePeriod->update(['is_active' => false]);

        return back()->with('success', "{$performancePeriod->name} deactivated.");
    }

    public function destroy(PerformancePeriod $performancePeriod)
    {
        abort_if($performancePeriod->is_active, 422, 'Cannot delete the active performance period.');

        $performancePeriod->delete();

        return back()->with('success', 'Performance period deleted.');
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private function pendingCounts(PerformancePeriod $p): array
    {
        $pid = $p->id;

        return array_filter([
            'OPCR not yet approved' => Opcr::where('performance_period_id', $pid)
                ->whereNotIn('status', ['approved'])
                ->count(),

            'IPCR not yet committed' => Ipcr::where('performance_period_id', $pid)
                ->whereNotIn('status', ['committed', 'released_by_pmt'])
                ->count(),

            'Accomplishments in progress' => AccomplishmentSubmission::where('performance_period_id', $pid)
                ->whereNotIn('status', ['pmt_approved', 'returned_to_employee'])
                ->count(),

            'ORS entries unsubmitted' => OrsEntry::where('performance_period_id', $pid)
                ->whereIn('status', ['draft', 'recording', 'paused'])
                ->count(),

            'QAR not yet PMT-approved' => QarHeader::where('performance_period_id', $pid)
                ->whereNotIn('pmt_status', ['pmt_approved'])
                ->whereIn('status', ['submitted'])
                ->count(),
        ]);
    }
}
