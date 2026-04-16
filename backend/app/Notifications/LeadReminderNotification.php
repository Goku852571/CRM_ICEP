<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Lead;

class LeadReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected $lead;
    protected $notes;

    /**
     * Create a new notification instance.
     */
    public function __construct(Lead $lead, $notes = '')
    {
        $this->lead = $lead;
        $this->notes = $notes;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'lead_reminder',
            'title' => 'Recordatorio: Llamar a ' . $this->lead->name,
            'message' => 'Tienes un compromiso para volver a llamar a este lead. ' . ($this->notes ? 'Notas: ' . $this->notes : ''),
            'lead_id' => $this->lead->id,
            'action_url' => '/leads',
        ];
    }
}
