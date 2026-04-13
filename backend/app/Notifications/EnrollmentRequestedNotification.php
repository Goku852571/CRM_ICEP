<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EnrollmentRequestedNotification extends Notification
{
    use Queueable;

    protected $enrollment;

    public function __construct($enrollment)
    {
        $this->enrollment = $enrollment;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'enrollment_requested',
            'enrollment_id' => $this->enrollment->id,
            'title' => 'Solicitud de Matrícula',
            'message' => "El asesor {$this->enrollment->advisor->name} ha solicitado la matrícula para {$this->enrollment->student_name}.",
        ];
    }
}
