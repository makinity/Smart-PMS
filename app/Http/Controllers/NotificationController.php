<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** GET /api/notifications — last 10, formatted */
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()
            ->notifications()
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($n) => [
                'id'      => $n->id,
                'title'   => $n->data['message'] ?? $n->data['title'] ?? 'Notification',
                'body'    => $n->data['body'] ?? null,
                'type'    => $n->data['type'] ?? 'info',
                'event'   => $n->data['event'] ?? null,
                'url'     => $n->data['url'] ?? null,
                'time'    => $n->created_at->diffForHumans(),
                'is_read' => $n->read_at !== null,
            ]);

        return response()->json($items);
    }

    /** POST /api/notifications/read-all */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['ok' => true]);
    }

    /** POST /api/notify/reminder — send a nudge notification to a specific user */
    public function sendReminder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:users,id',
            'context'     => 'required|string',
            'month'       => 'nullable|string',
        ]);

        $employee = \App\Models\User::findOrFail($validated['employee_id']);

        $messages = [
            'qar_missing_mpor' => 'Please submit your MPOR' . ($validated['month'] ? ' for ' . \Carbon\Carbon::parse($validated['month'] . '-01')->format('F Y') : '') . '. It is required for the QAR submission.',
        ];

        $message = $messages[$validated['context']] ?? 'You have a pending action required. Please check your portal.';

        $employee->notify(new \App\Notifications\GenericReminder($message, $validated['context']));

        return response()->json(['ok' => true]);
    }

    /** POST /api/notifications/{id}/read */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json(['ok' => true]);
    }
}
