<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;

class WorkflowNotificationDispatcher
{
    public function notifyUser(User $user, Notification $notification): void
    {
        if (!$user->is_active) {
            return;
        }

        $user->notify($notification);
    }

    public function notifyRole(string $role, Notification $notification, ?callable $filter = null): void
    {
        $users = User::query()
            ->where('role', $role)
            ->where('is_active', true)
            ->get();

        foreach ($users as $user) {
            if ($filter && !$filter($user)) {
                continue;
            }

            $user->notify($notification);
        }
    }
}

