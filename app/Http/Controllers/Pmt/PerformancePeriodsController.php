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
use App\Models\UnitWorkPlan;
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

        // All active employees in the system
        $allEmployeeIds = \App\Models\User::where('role', 'employee')->where('is_active', true)->pluck('id');

        // Employees with no IPCR at all for this period
        $withIpcr = Ipcr::where('performance_period_id', $pid)->pluck('employee_id');
        $noIpcrIds = $allEmployeeIds->diff($withIpcr);

        // Employees with IPCR not yet committed
        $uncommittedIpcrIds = Ipcr::where('performance_period_id', $pid)
            ->whereNotIn('status', ['committed', 'released_by_pmt'])
            ->pluck('employee_id');

        // Employees with committed IPCR but no accomplishment submission
        $withAccomplishment = AccomplishmentSubmission::where('performance_period_id', $pid)->pluck('employee_id');
        $committedNoAccomplishmentIds = Ipcr::where('performance_period_id', $pid)
            ->whereIn('status', ['committed', 'released_by_pmt'])
            ->pluck('employee_id')
            ->diff($withAccomplishment);

        // Employees with draft/in-progress accomplishment
        $draftAccomplishmentIds = AccomplishmentSubmission::where('performance_period_id', $pid)
            ->whereIn('status', ['draft', 'returned_to_employee'])
            ->pluck('employee_id');

        // Employees with unsubmitted ORS
        $orsIds = OrsEntry::where('performance_period_id', $pid)
            ->whereIn('status', ['draft', 'recording', 'paused'])
            ->pluck('employee_id');

        $employeeIds = collect()
            ->merge($noIpcrIds)
            ->merge($uncommittedIpcrIds)
            ->merge($committedNoAccomplishmentIds)
            ->merge($draftAccomplishmentIds)
            ->merge($orsIds)
            ->unique();

        // Supervisors with unrated ORS entries or draft UWP
        $supervisorOrsIds = OrsEntry::where('performance_period_id', $pid)
            ->where('status', 'submitted')
            ->pluck('supervisor_id')
            ->unique();

        $supervisorUwpIds = UnitWorkPlan::where('performance_period_id', $pid)
            ->whereIn('status', ['draft', 'returned'])
            ->pluck('office_id')
            ->map(fn($oid) => \App\Models\User::where('office_id', $oid)->where('role', 'supervisor')->value('id'))
            ->filter()
            ->unique();

        // Accomplishments pending supervisor endorsement
        $supervisorAccomplishmentIds = AccomplishmentSubmission::where('performance_period_id', $pid)
            ->where('status', 'submitted')
            ->pluck('supervisor_id')
            ->filter()
            ->unique();

        $supervisorIds = collect()
            ->merge($supervisorOrsIds)
            ->merge($supervisorUwpIds)
            ->merge($supervisorAccomplishmentIds)
            ->unique();

        // Dept heads with no OPCR, pending accomplishment endorsement, or unsubmitted QAR
        $noOpcrDeptHeadIds = \App\Models\Office::where('is_active', true)
            ->get()
            ->filter(fn($o) => ! Opcr::where('performance_period_id', $pid)->where('office_id', $o->id)->whereIn('status', ['approved'])->exists())
            ->map(fn($o) => \App\Models\User::where('office_id', $o->id)->where('role', 'dept-head')->value('id'))
            ->filter();

        $deptHeadAccomplishmentIds = AccomplishmentSubmission::where('performance_period_id', $pid)
            ->whereIn('status', ['supervisor_endorsed'])
            ->pluck('dept_head_id')
            ->filter();

        $deptHeadQarIds = QarHeader::where('performance_period_id', $pid)
            ->whereNotIn('status', ['submitted', 'pmt_approved'])
            ->pluck('office_id')
            ->map(fn($oid) => \App\Models\User::where('office_id', $oid)->where('role', 'dept-head')->value('id'))
            ->filter();

        $deptHeadIds = collect()
            ->merge($noOpcrDeptHeadIds)
            ->merge($deptHeadAccomplishmentIds)
            ->merge($deptHeadQarIds)
            ->unique();

        $notif = fn(string $msg, string $url) =>
            new \App\Notifications\WorkflowEventNotification(
                type: 'alert',
                event: 'period.closing_reminder',
                message: $msg,
                url: $url,
            );

        \App\Models\User::whereIn('id', $employeeIds)->each(fn($u) =>
            $u->notify($notif(
                "The performance period \"{$name}\" is closing. Please complete all pending tasks (IPCR, ORS entries, or accomplishment submission).",
                '/employee/accomplishment'
            ))
        );

        \App\Models\User::whereIn('id', $supervisorIds)->each(fn($u) =>
            $u->notify($notif(
                "The performance period \"{$name}\" is closing. Please submit your UWP and review pending ORS entries or accomplishment submissions from your team.",
                '/supervisor/ors-monitoring'
            ))
        );

        \App\Models\User::whereIn('id', $deptHeadIds)->each(fn($u) =>
            $u->notify($notif(
                "The performance period \"{$name}\" is closing. Please ensure your OPCR is approved and complete any pending endorsements or QAR submissions.",
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

        // Employees with no IPCR for this period
        $allEmployeeIds = \App\Models\User::where('role', 'employee')->where('is_active', true)->pluck('id');
        $withIpcr       = Ipcr::where('performance_period_id', $pid)->pluck('employee_id');
        $noIpcr         = $allEmployeeIds->diff($withIpcr)->count();

        // Employees with committed IPCR but no accomplishment submission
        $withAccomplishment = AccomplishmentSubmission::where('performance_period_id', $pid)->pluck('employee_id');
        $noAccomplishment   = Ipcr::where('performance_period_id', $pid)
            ->whereIn('status', ['committed', 'released_by_pmt'])
            ->pluck('employee_id')
            ->diff($withAccomplishment)
            ->count();

        // Offices with no approved OPCR
        $noOpcr = \App\Models\Office::where('is_active', true)
            ->get()
            ->filter(fn($o) => ! Opcr::where('performance_period_id', $pid)->where('office_id', $o->id)->whereIn('status', ['approved'])->exists())
            ->count();

        return array_filter([
            'Offices with no approved OPCR'          => $noOpcr,
            'Employees with no IPCR set up'          => $noIpcr,
            'IPCR not yet committed'                 => Ipcr::where('performance_period_id', $pid)->whereNotIn('status', ['committed', 'released_by_pmt'])->count(),
            'Employees with no accomplishment filed' => $noAccomplishment,
            'Accomplishments in progress'            => AccomplishmentSubmission::where('performance_period_id', $pid)->whereNotIn('status', ['pmt_approved', 'returned_to_employee'])->count(),
            'ORS entries unsubmitted'                => OrsEntry::where('performance_period_id', $pid)->whereIn('status', ['draft', 'recording', 'paused'])->count(),
            'UWP not yet submitted'                  => \App\Models\UnitWorkPlan::where('performance_period_id', $pid)->whereIn('status', ['draft', 'returned'])->count(),
            'QAR not yet PMT-approved'               => QarHeader::where('performance_period_id', $pid)->whereIn('status', ['submitted'])->whereNull('pmt_status')->count(),
        ]);
    }
}
