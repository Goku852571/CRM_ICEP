<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentConfirmedNotification extends Notification
{
    use Queueable;

    protected $enrollment;
    protected $jefe;

    public function __construct($enrollment, $jefe)
    {
        $this->enrollment = $enrollment;
        $this->jefe       = $jefe;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'          => 'payment_confirmed',
            'enrollment_id' => $this->enrollment->id,
            'title'         => '✅ Pago Confirmado — Solicita la Matrícula',
            'message'       => "El jefe {$this->jefe->name} confirmó el pago de {$this->enrollment->student_name}. Ya puedes solicitar la matrícula.",
            'jefe_name'     => $this->jefe->name,
            'student_name'  => $this->enrollment->student_name,
            'course_name'   => $this->enrollment->course->name ?? null,
        ];
    }
}
