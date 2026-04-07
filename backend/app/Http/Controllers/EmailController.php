<?php

namespace App\Http\Controllers;

use App\Models\EmailCampaign;
use App\Models\EmailCampaignLog;
use App\Models\EmailTemplate;
use App\Models\EmailSettings;
use App\Models\Lead;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmailController extends Controller
{
    // ─── CONFIGURACIÓN SMTP ────────────────────────────────────────────────

    public function getSettings()
    {
        $settings = DB::table('email_settings')->first();
        if ($settings) {
            $settings->password = ''; // No devolver contraseña al frontend
        }
        return response()->json(['data' => $settings]);
    }

    public function saveSettings(Request $request)
    {
        $validated = $request->validate([
            'driver'       => 'required|in:smtp,mailgun,ses',
            'host'         => 'required_if:driver,smtp|nullable|string',
            'port'         => 'required_if:driver,smtp|nullable|integer',
            'username'     => 'nullable|string',
            'password'     => 'nullable|string',
            'encryption'   => 'nullable|in:tls,ssl,',
            'from_address' => 'required|email',
            'from_name'    => 'required|string',
        ]);

        $existing = DB::table('email_settings')->first();

        // Si no se envía contraseña, mantener la existente
        if (empty($validated['password']) && $existing) {
            unset($validated['password']);
        }

        if ($existing) {
            DB::table('email_settings')->where('id', $existing->id)->update(array_merge($validated, ['updated_at' => now()]));
        } else {
            DB::table('email_settings')->insert(array_merge($validated, ['created_at' => now(), 'updated_at' => now()]));
        }

        return response()->json(['message' => 'Configuración SMTP guardada correctamente.']);
    }

    public function testSettings(Request $request)
    {
        $request->validate(['test_email' => 'required|email']);

        try {
            $this->applySmtpConfig();

            Mail::raw('Este es un correo de prueba desde el sistema ICEP CRM.', function ($message) use ($request) {
                $settings = DB::table('email_settings')->first();
                $message->to($request->test_email)
                        ->subject('✅ Prueba de Configuración SMTP — ICEP')
                        ->from($settings->from_address, $settings->from_name);
            });

            return response()->json(['message' => 'Correo de prueba enviado correctamente.']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 422);
        }
    }

    // ─── PLANTILLAS ────────────────────────────────────────────────────────

    public function indexTemplates()
    {
        $templates = EmailTemplate::with('createdBy:id,name')
            ->orderByDesc('created_at')
            ->get();
        return response()->json(['data' => $templates]);
    }

    public function storeTemplate(Request $request)
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'subject'         => 'required|string|max:255',
            'html_body'       => 'required|string',
            'variables_hint'  => 'nullable|array',
        ]);

        $template = EmailTemplate::create(array_merge($validated, [
            'created_by' => Auth::id(),
        ]));

        return response()->json(['data' => $template, 'message' => 'Plantilla creada correctamente.'], 201);
    }

    public function showTemplate(EmailTemplate $template)
    {
        return response()->json(['data' => $template]);
    }

    public function updateTemplate(Request $request, EmailTemplate $template)
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'subject'        => 'required|string|max:255',
            'html_body'      => 'required|string',
            'variables_hint' => 'nullable|array',
        ]);

        $template->update($validated);
        return response()->json(['data' => $template, 'message' => 'Plantilla actualizada correctamente.']);
    }

    public function destroyTemplate(EmailTemplate $template)
    {
        $template->delete();
        return response()->json(['message' => 'Plantilla eliminada.']);
    }

    // ─── CAMPAÑAS ──────────────────────────────────────────────────────────

    public function indexCampaigns()
    {
        $campaigns = EmailCampaign::with(['createdBy:id,name', 'course:id,name'])
            ->orderByDesc('created_at')
            ->get();
        return response()->json(['data' => $campaigns]);
    }

    public function storeCampaign(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'subject'               => 'required|string|max:255',
            'html_body'             => 'required|string',
            'template_id'           => 'nullable|exists:email_templates,id',
            'sender_name'           => 'required|string',
            'sender_email'          => 'required|email',
            'recipient_type'        => 'required|in:leads,course,selected',
            'recipient_course_id'   => 'nullable|exists:courses,id',
            'recipient_lead_ids'    => 'nullable|array',
        ]);

        $campaign = EmailCampaign::create(array_merge($validated, [
            'status'     => 'draft',
            'created_by' => Auth::id(),
        ]));

        return response()->json(['data' => $campaign, 'message' => 'Campaña guardada como borrador.'], 201);
    }

    public function showCampaign(EmailCampaign $campaign)
    {
        $campaign->load(['createdBy:id,name', 'course:id,name', 'logs']);
        return response()->json(['data' => $campaign]);
    }

    public function destroyCampaign(EmailCampaign $campaign)
    {
        $campaign->delete();
        return response()->json(['message' => 'Campaña eliminada.']);
    }

    // ─── ENVÍO DE CAMPAÑA ──────────────────────────────────────────────────

    public function sendCampaign(Request $request, EmailCampaign $campaign)
    {
        if ($campaign->status === 'sent') {
            return response()->json(['message' => 'Esta campaña ya fue enviada.'], 422);
        }

        try {
            $this->applySmtpConfig();
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error en configuración SMTP: ' . $e->getMessage()], 422);
        }

        // Resolver destinatarios
        $recipients = $this->resolveRecipients($campaign);

        if (empty($recipients)) {
            return response()->json(['message' => 'No se encontraron destinatarios válidos con correo registrado.'], 422);
        }

        $campaign->update([
            'status'           => 'sending',
            'total_recipients' => count($recipients),
        ]);

        $sentCount   = 0;
        $failedCount = 0;

        $settings = DB::table('email_settings')->first();

        foreach ($recipients as $recipient) {
            try {
                // Personalizar HTML con variables del destinatario
                $html = $this->personalizeHtml($campaign->html_body, $recipient);

                Mail::html($html, function ($message) use ($recipient, $campaign, $settings) {
                    $message->to($recipient['email'], $recipient['name'])
                            ->subject($campaign->subject)
                            ->from(
                                $settings->from_address ?? $campaign->sender_email,
                                $settings->from_name ?? $campaign->sender_name
                            );
                });

                EmailCampaignLog::create([
                    'campaign_id'     => $campaign->id,
                    'recipient_email' => $recipient['email'],
                    'recipient_name'  => $recipient['name'],
                    'status'          => 'sent',
                    'sent_at'         => now(),
                ]);
                $sentCount++;
            } catch (\Exception $e) {
                EmailCampaignLog::create([
                    'campaign_id'     => $campaign->id,
                    'recipient_email' => $recipient['email'],
                    'recipient_name'  => $recipient['name'],
                    'status'          => 'failed',
                    'error_message'   => $e->getMessage(),
                ]);
                $failedCount++;
                Log::error("Email campaign #{$campaign->id} failed for {$recipient['email']}: " . $e->getMessage());
            }
        }

        $campaign->update([
            'status'       => $failedCount === count($recipients) ? 'failed' : 'sent',
            'sent_at'      => now(),
            'sent_count'   => $sentCount,
            'failed_count' => $failedCount,
        ]);

        return response()->json([
            'message'      => "Campaña enviada. $sentCount enviados, $failedCount fallidos.",
            'sent_count'   => $sentCount,
            'failed_count' => $failedCount,
        ]);
    }

    // ─── VISTA PREVIA DE DESTINATARIOS ─────────────────────────────────────

    public function previewRecipients(Request $request)
    {
        $request->validate([
            'recipient_type'      => 'required|in:leads,course,selected',
            'recipient_course_id' => 'nullable|exists:courses,id',
            'recipient_lead_ids'  => 'nullable|array',
        ]);

        $mock = new EmailCampaign($request->only(['recipient_type', 'recipient_course_id', 'recipient_lead_ids']));
        $recipients = $this->resolveRecipients($mock);

        return response()->json([
            'total'      => count($recipients),
            'recipients' => array_slice($recipients, 0, 50), // Máximo 50 previews
        ]);
    }

    // ─── HELPERS PRIVADOS ──────────────────────────────────────────────────

    private function resolveRecipients(EmailCampaign $campaign): array
    {
        $recipients = [];

        if ($campaign->recipient_type === 'leads') {
            // Todos los leads con email
            $leads = Lead::whereNotNull('email')->whereNotIn('email', [''])->get();
            foreach ($leads as $lead) {
                $recipients[] = ['email' => $lead->email, 'name' => $lead->name, 'status' => $lead->status];
            }
        } elseif ($campaign->recipient_type === 'course') {
            // Alumnos matriculados en un curso específico (enrollment_forms con email)
            $forms = DB::table('enrollment_forms')
                ->where('course_id', $campaign->recipient_course_id)
                ->whereNotNull('student_email')
                ->where('status', '!=', 'cancelled')
                ->get();
            foreach ($forms as $form) {
                $recipients[] = ['email' => $form->student_email, 'name' => $form->student_name, 'status' => $form->status];
            }
        } elseif ($campaign->recipient_type === 'selected') {
            // IDs de leads seleccionados manualmente
            $ids = $campaign->recipient_lead_ids ?? [];
            $leads = Lead::whereIn('id', $ids)->whereNotNull('email')->get();
            foreach ($leads as $lead) {
                $recipients[] = ['email' => $lead->email, 'name' => $lead->name, 'status' => $lead->status];
            }
        }

        return $recipients;
    }

    private function personalizeHtml(string $html, array $recipient): string
    {
        return str_replace(
            ['{{nombre}}', '{{email}}', '{{name}}'],
            [$recipient['name'], $recipient['email'], $recipient['name']],
            $html
        );
    }

    private function applySmtpConfig(): void
    {
        $settings = DB::table('email_settings')->first();
        if (!$settings) {
            throw new \Exception('No se ha configurado el servidor SMTP. Configúralo en el módulo de correo.');
        }

        Config::set('mail.default', $settings->driver);
        Config::set('mail.mailers.smtp.host', $settings->host);
        Config::set('mail.mailers.smtp.port', $settings->port);
        Config::set('mail.mailers.smtp.username', $settings->username);
        Config::set('mail.mailers.smtp.password', $settings->password);
        Config::set('mail.mailers.smtp.encryption', $settings->encryption ?: null);
        Config::set('mail.from.address', $settings->from_address);
        Config::set('mail.from.name', $settings->from_name);
    }
}
