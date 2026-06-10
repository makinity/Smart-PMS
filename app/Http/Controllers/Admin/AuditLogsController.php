<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class AuditLogsController extends Controller
{
    public function index(Request $request)
    {
        $filters = [
            'search' => trim((string) $request->input('search', '')),
            'log_name' => $request->input('log_name', ''),
            'event' => $request->input('event', ''),
            'causer' => $request->input('causer', ''),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
        ];

        $activities = Activity::query()
            ->with(['causer:id,name,role,profile_photo_path', 'subject'])
            ->when($filters['search'], function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhere('event', 'like', "%{$search}%")
                        ->orWhere('subject_type', 'like', "%{$search}%")
                        ->orWhere('log_name', 'like', "%{$search}%")
                        ->orWhereHasMorph('causer', [User::class], function ($causerQuery) use ($search) {
                            $causerQuery->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['log_name'], fn ($q, $logName) => $q->where('log_name', $logName))
            ->when($filters['event'], fn ($q, $event) => $q->where('event', $event))
            ->when($filters['causer'], fn ($q, $causer) => $q->where('causer_id', $causer)->where('causer_type', User::class))
            ->when($filters['date_from'], fn ($q, $from) => $q->whereDate('created_at', '>=', $from))
            ->when($filters['date_to'], fn ($q, $to) => $q->whereDate('created_at', '<=', $to))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Activity $activity) => $this->transform($activity));

        return Inertia::render('Admin/AuditLogs/Index', [
            'activities' => $activities,
            'filters' => $filters,
            'logNames' => Activity::query()->whereNotNull('log_name')->distinct()->orderBy('log_name')->pluck('log_name'),
            'events' => Activity::query()->whereNotNull('event')->distinct()->orderBy('event')->pluck('event'),
            'causers' => $this->causerOptions(),
            'stats' => [
                'total' => Activity::count(),
                'today' => Activity::whereDate('created_at', today())->count(),
                'created' => Activity::where('event', 'created')->count(),
                'updated' => Activity::where('event', 'updated')->count(),
                'deleted' => Activity::where('event', 'deleted')->count(),
            ],
        ]);
    }

    private function transform(Activity $activity): array
    {
        $changes = $this->toArray($activity->attribute_changes);   // { old, attributes } — model diffs
        $properties = $this->toArray($activity->properties);       // custom withProperties() payload

        return [
            'id' => $activity->id,
            'description' => $activity->description,
            'event' => $activity->event,
            'log_name' => $activity->log_name,
            'subject_type' => $activity->subject_type ? class_basename($activity->subject_type) : null,
            'subject_id' => $activity->subject_id,
            'subject_label' => $this->subjectLabel($activity, $changes),
            'causer' => $activity->causer ? [
                'id' => $activity->causer->id,
                'name' => $activity->causer->name,
                'role' => $activity->causer->role,
                'avatar' => $activity->causer->profile_photo_url,
            ] : null,
            'changes' => [
                'attributes' => $changes['attributes'] ?? null,
                'old' => $changes['old'] ?? null,
            ],
            'properties' => $properties,
            'created_at' => $activity->created_at?->toDateTimeString(),
            'created_human' => $activity->created_at?->diffForHumans(),
        ];
    }

    private function toArray($value): array
    {
        if ($value instanceof Collection) {
            return $value->toArray();
        }

        return (array) ($value ?? []);
    }

    private function subjectLabel(Activity $activity, array $changes): ?string
    {
        $subject = $activity->subject;
        if ($subject) {
            return $subject->name
                ?? $subject->employee_id
                ?? $subject->title
                ?? ('#'.$subject->getKey());
        }

        $attributes = $changes['attributes'] ?? [];

        return $attributes['name']
            ?? $attributes['employee_id']
            ?? ($activity->subject_id ? '#'.$activity->subject_id : null);
    }

    private function causerOptions()
    {
        $ids = Activity::query()
            ->where('causer_type', User::class)
            ->whereNotNull('causer_id')
            ->distinct()
            ->pluck('causer_id');

        return User::query()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name', 'role'])
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'role' => $u->role]);
    }
}
