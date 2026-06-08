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
