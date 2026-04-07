<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Event;
use App\Models\User;

class EventReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public $event;
    public $user;

    public function __construct(Event $event, User $user)
    {
        $this->event = $event;
        $this->user = $user;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "📌 Recordatorio de Evento: {$this->event->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.event-reminder',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
