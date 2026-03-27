<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TicketStatusUpdatedNotification extends Notification
{
    use Queueable;

    protected $ticket;
    protected $oldStatus;
    protected $newStatus;

    public function __construct($ticket, $oldStatus, $newStatus)
    {
        $this->ticket = $ticket;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'ticket_status',
            'ticket_id' => $this->ticket->id,
            'title' => 'Estado de ticket actualizado',
            'message' => "El ticket '{$this->ticket->title}' cambió a {$this->newStatus}",
        ];
    }
}
