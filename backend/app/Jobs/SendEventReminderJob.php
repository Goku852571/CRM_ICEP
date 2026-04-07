<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Event;

class SendEventReminderJob implements ShouldQueue
{
    use Queueable;

    public $event;

    /**
     * Create a new job instance.
     */
    public function __construct(Event $event)
    {
        $this->event = $event;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $event = $this->event->load('participants');
        
        // Aplicar configuración SMTP dinámica desde el módulo de mail masivo
        $this->applySmtpConfig();

        foreach ($event->participants as $participant) {
            if ($participant->email) {
                \Illuminate\Support\Facades\Mail::to($participant->email)
                    ->send(new \App\Mail\EventReminderMail($event, $participant));
            }
        }
    }

    private function applySmtpConfig(): void
    {
        $settings = \Illuminate\Support\Facades\DB::table('email_settings')->first();
        if (!$settings) {
            return; // Fallback to default .env if not set
        }

        \Illuminate\Support\Facades\Config::set('mail.default', $settings->driver);
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.host', $settings->host);
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.port', $settings->port);
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.username', $settings->username);
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.password', $settings->password);
        \Illuminate\Support\Facades\Config::set('mail.mailers.smtp.encryption', $settings->encryption ?: null);
        \Illuminate\Support\Facades\Config::set('mail.from.address', $settings->from_address);
        \Illuminate\Support\Facades\Config::set('mail.from.name', $settings->from_name);
    }
}
