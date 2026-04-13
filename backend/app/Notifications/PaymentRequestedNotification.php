<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentRequestedNotification extends Notification
{
    use Queueable;

    protected $enrollment;
    protected $advisor;

    public function __construct($enrollment, $advisor)
    {
        $this->enrollment = $enrollment;
        $this->advisor    = $advisor;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'            => 'payment_requested',
            'enrollment_id'   => $this->enrollment->id,
            'title'           => '💳 Verificación de Pago Pendiente',
            'message'         => "El asesor {$this->advisor->name} solicita que verifiques el pago de {$this->enrollment->student_name} para el curso {$this->enrollment->course->name}.",
            'transaction_id'  => $this->enrollment->bank_transaction_id,
            'advisor_name'    => $this->advisor->name,
            'student_name'    => $this->enrollment->student_name,
            'course_name'     => $this->enrollment->course->name ?? null,
        ];
    }
}
