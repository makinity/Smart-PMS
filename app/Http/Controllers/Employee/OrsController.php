<?php

namespace App\Http\Controllers\Employee;

use App\Events\OrsActivityEvent;
use App\Http\Controllers\Controller;
use App\Models\Ipcr;
use App\Models\IpcrItem;
use App\Models\Mpor;
use App\Models\OrsEntry;
use App\Models\OrsEntryEvidence;
use App\Models\PerformancePeriod;
use App\Models\UwpMfo;
use App\Models\User;
use App\Notifications\WorkflowEventNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class OrsController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $period = PerformancePeriod::current();

        // IPCR gate
        $committedIpcr = null;
        $orsGateLocked = true;
        $orsGateReason = null;

        if (! $period) {
            $orsGateReason = 'No active performance period.';
        } else {
            $committedIpcr = Ipcr::where('employee_id', $user->id)
                ->where('performance_period_id', $period->id)
                ->where('status', 'committed')
                ->with(['items.indicator.uwpMfo'])
                ->first();

            if (! $committedIpcr) {
                $orsGateReason = 'You must commit your IPCR before logging tasks.';
            } else {
                $orsGateLocked = false;
            }
        }

        // Build orsOptions (grouped by output title = MFO title)
        $orsOptions = [];
        if ($committedIpcr) {
            $groups = [];
            foreach ($committedIpcr->items as $item) {
                $mfo = $item->indicator?->uwpMfo;
                $outputTitle = $mfo?->title ?? 'General';
                $key = md5(strtolower($outputTitle));
                if (! isset($groups[$key])) {
                    $groups[$key] = ['output_key' => $key, 'output_title' => $outputTitle, 'indicators' => []];
                }
                $groups[$key]['indicators'][] = [
                    'ipcr_item_id'   => $item->id,
                    'indicator_text' => $item->indicator?->indicator_text ?? 'Unnamed',
                ];
            }
            usort($groups, fn($a, $b) => strcmp($a['output_title'], $b['output_title']));
            foreach ($groups as &$g) {
                usort($g['indicators'], fn($a, $b) => strcmp($a['indicator_text'], $b['indicator_text']));
            }
            $orsOptions = array_values($groups);
        }

        // Supervisors
        $supervisors = User::where('role', 'supervisor')
            ->where('is_active', true)
            ->with('office')
            ->orderBy('name')
            ->get()
            ->map(fn($s) => [
                'id'    => $s->id,
                'label' => $s->name . ($s->office ? ' — ' . $s->office->name : ''),
            ]);

        // Calendar entries (all for this period, grouped by date)
        $entries = [];
        if ($committedIpcr) {
            $rawEntries = OrsEntry::where('employee_id', $user->id)
                ->when($period, fn($q) => $q->where('performance_period_id', $period->id))
                ->with(['ipcrItem.indicator', 'evidences', 'supervisor'])
                ->orderBy('work_date')
                ->get();

            foreach ($rawEntries as $e) {
                $date = $e->work_date->toDateString();
                if (! isset($entries[$date])) {
                    $entries[$date] = [];
                }
                $entries[$date][] = $this->formatEntry($e);
            }
        }

        // Active timer entry
        $activeEntry = OrsEntry::where('employee_id', $user->id)
            ->whereIn('status', ['recording', 'paused'])
            ->with(['ipcrItem.indicator', 'supervisor', 'evidences'])
            ->first();

        // Stats
        $now = now();
        $weekStart = $now->copy()->startOfWeek();
        $weekEnd = $now->copy()->endOfWeek();

        $statsQuery = fn() => OrsEntry::where('employee_id', $user->id)
            ->when($period, fn($q) => $q->where('performance_period_id', $period->id));

        $stats = [
            'this_week' => (clone $statsQuery())->whereBetween('work_date', [$weekStart, $weekEnd])->count(),
            'drafts'    => (clone $statsQuery())->where('status', 'draft')->count(),
            'submitted' => (clone $statsQuery())->where('status', 'submitted')->count(),
            'validated' => (clone $statsQuery())->whereIn('status', ['rated', 'validated', 'locked'])->count(),
        ];

        // MPOR-locked months — employee cannot log/submit ORS for these months
        $mporLockedMonths = Mpor::where('employee_id', $user->id)
            ->whereIn('status', ['submitted', 'approved', 'endorsed'])
            ->pluck('month')
            ->values()
            ->toArray();

        return Inertia::render('Employee/Ors/Index', [
            'period'           => $period,
            'orsGateLocked'    => $orsGateLocked,
            'orsGateReason'    => $orsGateReason,
            'orsOptions'       => $orsOptions,
            'supervisors'      => $supervisors,
            'calendarEntries'  => $entries,
            'activeEntry'      => $activeEntry ? $this->formatEntry($activeEntry) : null,
            'stats'            => $stats,
            'mporLockedMonths' => $mporLockedMonths,
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $period = PerformancePeriod::current();

        abort_if(! $period, 422, 'No active performance period.');

        $ipcr = Ipcr::where('employee_id', $user->id)
            ->where('performance_period_id', $period->id)
            ->where('status', 'committed')
            ->firstOrFail();

        $data = $request->validate([
            'work_date'    => ['required', 'date'],
            'ipcr_item_id' => ['required', 'integer', 'exists:ipcr_items,id'],
            'supervisor_id' => ['required', 'integer', 'exists:users,id'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ]);

        // Block if MPOR for this month is already submitted/approved/endorsed
        $workMonth = \Carbon\Carbon::parse($data['work_date'])->format('Y-m');
        $mporLocked = Mpor::where('employee_id', $user->id)
            ->where('month', $workMonth)
            ->whereIn('status', ['submitted', 'approved', 'endorsed'])
            ->exists();
        abort_if($mporLocked, 422, "Your MPOR for {$workMonth} has already been submitted. ORS entries for this month are locked.");

        // Ensure ipcr_item belongs to this employee's IPCR
        $ipcrItem = IpcrItem::where('id', $data['ipcr_item_id'])
            ->where('ipcr_id', $ipcr->id)
            ->firstOrFail();

        // Ensure supervisor has supervisor role
        $supervisor = User::findOrFail($data['supervisor_id']);
        abort_if($supervisor->role !== 'supervisor', 422, 'Selected user is not a supervisor.');

        // Check no other entry is recording
        $alreadyRecording = OrsEntry::where('employee_id', $user->id)
            ->where('status', 'recording')
            ->exists();

        $entry = OrsEntry::create([
            'employee_id'          => $user->id,
            'supervisor_id'        => $data['supervisor_id'],
            'performance_period_id' => $period->id,
            'ipcr_id'              => $ipcr->id,
            'ipcr_item_id'         => $ipcrItem->id,
            'work_date'            => $data['work_date'],
            'notes'                => $data['notes'] ?? null,
            'status'               => 'draft',
            'total_seconds'        => 0,
        ]);

        // Auto-start timer if nothing else is recording
        if (! $alreadyRecording) {
            $entry->update(['status' => 'recording', 'started_at' => now()]);
        }

        broadcast(new OrsActivityEvent($entry->fresh()));

        return back()->with('success', 'Task logged successfully.');
    }

    public function timerAction(Request $request, OrsEntry $orsEntry)
    {
        $user = auth()->user();
        abort_if($orsEntry->employee_id !== $user->id, 403);
        abort_if($orsEntry->isLocked(), 422, 'Entry is locked.');

        $action = $request->validate(['action' => ['required', 'in:start,pause,resume,stop']])['action'];

        match ($action) {
            'start' => $this->timerStart($orsEntry),
            'pause' => $this->timerPause($orsEntry),
            'resume' => $this->timerResume($orsEntry),
            'stop'  => $this->timerStop($orsEntry),
        };

        broadcast(new OrsActivityEvent($orsEntry->fresh()));

        return back();
    }

    private function timerStart(OrsEntry $e)
    {
        abort_if($e->status !== 'draft', 422, 'Entry must be draft to start.');
        abort_if(
            OrsEntry::where('employee_id', $e->employee_id)->where('status', 'recording')->where('id', '!=', $e->id)->exists(),
            422, 'Another entry is already recording.'
        );
        $e->update(['status' => 'recording', 'started_at' => now()]);
    }

    private function timerPause(OrsEntry $e)
    {
        abort_if($e->status !== 'recording', 422);
        $elapsed = $e->started_at ? max(0, (int) $e->started_at->diffInSeconds(now())) : 0;
        $e->update(['status' => 'paused', 'total_seconds' => $e->total_seconds + $elapsed, 'started_at' => null, 'stopped_at' => now()]);
    }

    private function timerResume(OrsEntry $e)
    {
        abort_if($e->status !== 'paused', 422);
        abort_if(
            OrsEntry::where('employee_id', $e->employee_id)->where('status', 'recording')->where('id', '!=', $e->id)->exists(),
            422, 'Another entry is already recording.'
        );
        $e->update(['status' => 'recording', 'started_at' => now()]);
    }

    private function timerStop(OrsEntry $e)
    {
        $elapsed = ($e->status === 'recording' && $e->started_at) ? max(0, (int) $e->started_at->diffInSeconds(now())) : 0;
        $e->update(['status' => 'draft', 'total_seconds' => $e->total_seconds + $elapsed, 'started_at' => null, 'stopped_at' => now()]);
    }

    public function submit(Request $request, OrsEntry $orsEntry)
    {
        $user = auth()->user();
        abort_if($orsEntry->employee_id !== $user->id, 403);
        abort_if($orsEntry->isLocked(), 422, 'Entry already submitted.');
        abort_if(! in_array($orsEntry->status, ['draft', 'recording', 'paused']), 422);

        // Block if MPOR for this entry's month is locked
        $workMonth = $orsEntry->work_date->format('Y-m');
        $mporLocked = Mpor::where('employee_id', $user->id)
            ->where('month', $workMonth)
            ->whereIn('status', ['submitted', 'approved', 'endorsed'])
            ->exists();
        abort_if($mporLocked, 422, "Your MPOR for {$workMonth} has been submitted. This entry cannot be modified.");

        $data = $request->validate([
            'quantity'   => ['required', 'string', 'max:255'],
            'notes'      => ['nullable', 'string', 'max:1000'],
            'evidence'   => ['nullable', 'array'],
            'evidence.*' => ['file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,doc,docx,xlsx'],
        ]);

        // Accumulate any remaining seconds
        if ($orsEntry->status === 'recording' && $orsEntry->started_at) {
            $elapsed = max(0, (int) $orsEntry->started_at->diffInSeconds(now()));
            $orsEntry->total_seconds += $elapsed;
            $orsEntry->started_at = null;
        }

        // Store evidence files
        if ($request->hasFile('evidence')) {
            foreach ($request->file('evidence') as $file) {
                $slug = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME));
                $filename = $slug . '-' . time() . '-' . Str::random(6) . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs("ors_evidences/{$user->id}/{$orsEntry->id}", $filename, 'public');

                OrsEntryEvidence::create([
                    'ors_entry_id' => $orsEntry->id,
                    'file_name'    => $file->getClientOriginalName(),
                    'file_path'    => $path,
                    'mime_type'    => $file->getMimeType(),
                    'file_size'    => $file->getSize(),
                    'uploaded_at'  => now(),
                ]);
            }
        }

        $orsEntry->update([
            'quantity'     => $data['quantity'],
            'notes'        => $data['notes'] ?? $orsEntry->notes,
            'status'       => 'submitted',
            'submitted_at' => now(),
            'locked_at'    => now(),
        ]);

        broadcast(new OrsActivityEvent($orsEntry->fresh()));

        // Notify assigned supervisor
        $supervisor = User::find($orsEntry->supervisor_id);
        if ($supervisor) {
            $supervisor->notify(new WorkflowEventNotification(
                type:    'info',
                event:   'ors.submitted_to_supervisor',
                message: "{$user->name} submitted a task for your review: {$orsEntry->ipcrItem?->indicator?->indicator_text}",
                url:     route('supervisor.ors-monitoring.index') . "?ors_entry_id={$orsEntry->id}",
            ));
        }

        return back()->with('success', 'Task submitted for review.');
    }

    public function updateEntry(Request $request, OrsEntry $orsEntry)
    {
        $user = auth()->user();
        abort_if($orsEntry->employee_id !== $user->id, 403);
        abort_if($orsEntry->isLocked(), 422, 'Entry is locked.');

        $data = $request->validate([
            'quantity' => ['nullable', 'string', 'max:255'],
            'notes'    => ['nullable', 'string', 'max:1000'],
        ]);

        $orsEntry->update(array_filter($data, fn($v) => $v !== null));

        return back();
    }

    public function getEntry(OrsEntry $orsEntry)
    {
        abort_if($orsEntry->employee_id !== auth()->id(), 403);
        $orsEntry->load(['ipcrItem.indicator.uwpMfo', 'evidences', 'supervisor']);
        return response()->json($this->formatEntry($orsEntry));
    }

    private function formatEntry(OrsEntry $e): array
    {
        return [
            'id'              => $e->id,
            'work_date'       => $e->work_date->toDateString(),
            'status'          => $e->status,
            'total_seconds'   => $e->live_seconds,
            'started_at'      => $e->started_at?->toIso8601String(),
            'quantity'        => $e->quantity,
            'notes'           => $e->notes,
            'submitted_at'    => $e->submitted_at?->toIso8601String(),
            'locked_at'       => $e->locked_at?->toIso8601String(),
            'indicator_text'  => $e->ipcrItem?->indicator?->indicator_text ?? '—',
            'output_title'    => $e->ipcrItem?->indicator?->uwpMfo?->title ?? '—',
            'supervisor_name' => $e->supervisor?->name ?? '—',
            'evidence_count'  => $e->evidences?->count() ?? 0,
            'evidences'       => $e->evidences?->map(fn($ev) => [
                'id'          => $ev->id,
                'file_name'   => $ev->file_name,
                'file_path'   => Storage::url($ev->file_path),
                'mime_type'   => $ev->mime_type,
                'file_size'   => $ev->file_size,
                'uploaded_at' => $ev->uploaded_at?->diffForHumans(),
            ])->toArray() ?? [],
        ];
    }
}
