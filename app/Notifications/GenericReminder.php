<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GenericReminder extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $message,
        public readonly string $context,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'    => 'alert',
            'event'   => 'reminder.' . $this->context,
            'message' => $this->message,
            'url'     => null,
        ];
    }
}
