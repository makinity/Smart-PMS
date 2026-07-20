<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;

class WorkflowNotificationDispatcher
{
    public function notifyUser(User $user, Notification $notification): void
    {
        $user->loadMissing('employee');

        if (! ($user->employee?->is_active ?? false)) {
            return;
        }

        $user->notify($notification);
    }

    public function notifyRole(string $role, Notification $notification, ?callable $filter = null): void
    {
        $users = User::query()
            ->where('role', $role)
            ->whereHas('employee', fn ($q) => $q->where('is_active', true))
            ->with('employee')
            ->get();

        foreach ($users as $user) {
            if ($filter && ! $filter($user)) {
                continue;
            }

            $user->notify($notification);
        }
    }
}
