<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class WorkflowEventNotification extends Notification
{
    public function __construct(
        public readonly string $type,    // 'info' | 'success' | 'alert'
        public readonly string $event,   // e.g. 'uwp.submitted'
        public readonly string $message,
        public readonly ?string $url = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toDatabase(object $notifiable): array
    {
        return $this->payload();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload());
    }

    private function payload(): array
    {
        return [
            'type'    => $this->type,
            'event'   => $this->event,
            'message' => $this->message,
            'url'     => $this->url,
        ];
    }
}
