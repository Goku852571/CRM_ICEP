<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use App\Models\Lead;

class StalledLeadNotification extends Notification
{
    use Queueable;

    protected $lead;
    protected $staleDays;

    /**
     * Create a new notification instance.
     * 
     * @param mixed $lead
     * @param int $staleDays
     */
    public function __construct($lead, int $staleDays)
    {
        $this->lead = $lead;
        $this->staleDays = $staleDays;
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
            'type' => 'stalled_lead',
            'title' => 'Lead Estancado: ' . $this->lead->name,
            'message' => 'Este lead no ha tenido actividad en los últimos ' . $this->staleDays . ' días. Por favor, realiza un seguimiento.',
            'lead_id' => $this->lead->id,
            'action_url' => '/leads',
        ];
    }
}
