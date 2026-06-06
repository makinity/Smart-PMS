<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\DatabaseMessage;

class WorkflowEventNotification extends Notification
{
    public function __construct(
        public readonly string $type,    // 'info' | 'success' | 'warning'
        public readonly string $event,   // e.g. 'ors.submitted_to_supervisor'
        public readonly string $message,
        public readonly ?string $url = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'    => $this->type,
            'event'   => $this->event,
            'message' => $this->message,
            'url'     => $this->url,
        ];
    }
}
