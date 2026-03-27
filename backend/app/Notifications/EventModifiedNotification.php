<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EventModifiedNotification extends Notification
{
    use Queueable;

    protected $eventTitle;
    protected $actionName;

    public function __construct($eventTitle, $actionName)
    {
        $this->eventTitle = $eventTitle;
        $this->actionName = $actionName; // 'creado', 'actualizado', 'eliminado'
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'calendar_event',
            'title' => 'Evento ' . ucfirst($this->actionName),
            'message' => "El evento '{$this->eventTitle}' ha sido {$this->actionName}.",
        ];
    }
}
