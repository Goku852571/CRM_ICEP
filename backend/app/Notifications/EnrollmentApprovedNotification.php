<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EnrollmentApprovedNotification extends Notification
{
    use Queueable;

    protected $enrollment;
    protected $admin;

    public function __construct($enrollment, $admin)
    {
        $this->enrollment = $enrollment;
        $this->admin = $admin;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'enrollment_approved',
            'enrollment_id' => $this->enrollment->id,
            'title' => 'Matrícula Aprobada ✓',
            'message' => "La matrícula de {$this->enrollment->student_name} ha sido aprobada por {$this->admin->name}.",
        ];
    }
}
