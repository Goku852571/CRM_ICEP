<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EnrollmentCompletedNotification extends Notification
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
            'type' => 'enrollment_completed',
            'enrollment_id' => $this->enrollment->id,
            'title' => 'Matrícula Completada',
            'message' => "El estudiante {$this->enrollment->student_name} completó su matrícula.",
        ];
    }
}
