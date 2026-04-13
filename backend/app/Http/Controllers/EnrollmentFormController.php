<?php

namespace App\Http\Controllers;

use App\Models\EnrollmentForm;
use App\Models\EnrollmentFormHistory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Notifications\EnrollmentCompletedNotification;
use App\Notifications\EnrollmentRequestedNotification;
use App\Notifications\EnrollmentApprovedNotification;
use App\Notifications\PaymentRequestedNotification;
use App\Notifications\PaymentConfirmedNotification;
use App\Models\Lead;
use App\Models\LeadInteraction;

class EnrollmentFormController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = EnrollmentForm::with(['advisor', 'course'])
            ->orderBy('created_at', 'desc');

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_asesores')) {
            $query->where('advisor_id', $request->user()->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('advisor_id')) {
            $query->where('advisor_id', $request->advisor_id);
        }

        return $this->success($query->get(), 'Formularios de matrícula recuperados');
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'advisor_id' => 'required|exists:users,id',
            'course_id' => 'required|exists:courses,id',
            'student_name' => 'nullable|string',
            'student_email' => 'nullable|email',
            'student_phone' => 'nullable|string',
            'lead_id' => 'nullable|exists:leads,id',
        ]);

        $advisorId = $request->advisor_id;
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_asesores')) {
            $advisorId = $request->user()->id;
        }

        $enrollment = EnrollmentForm::create([
            'uuid' => (string) Str::uuid(),
            'advisor_id' => $advisorId,
            'course_id' => $request->course_id,
            'student_name' => $request->student_name,
            'student_email' => $request->student_email,
            'student_phone' => $request->student_phone,
            'lead_id' => $request->lead_id,
            'status' => 'pending_send',
        ]);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id' => $request->user()->id,
            'action' => 'created',
            'new_status' => 'pending_send',
            'notes' => 'Formulario generado por asesor',
        ]);

        return $this->success($enrollment->load(['advisor', 'course']), 'Formulario creado', 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::with([
            'advisor', 'course', 'histories.user',
            'paymentRequestedTo', 'paymentConfirmedBy'
        ])->findOrFail($id);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_asesores')) {
            if ($enrollment->advisor_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }
        return $this->success($enrollment);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::findOrFail($id);
        
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_asesores')) {
            if ($enrollment->advisor_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        $request->validate([
            'status' => 'required|in:pending_send,sent,completed,payment_pending,payment_confirmed,in_review,approved,incomplete,void',
            'notes'  => 'nullable|string'
        ]);

        if ($enrollment->status === $request->status) {
            return $this->success($enrollment, 'El estado ya es el solicitado');
        }

        $oldStatus = $enrollment->status;
        $enrollment->update([
            'status' => $request->status,
            'sent_at' => $request->status === 'sent' && !$enrollment->sent_at ? now() : $enrollment->sent_at,
            'completed_at' => $request->status === 'completed' && !$enrollment->completed_at ? now() : $enrollment->completed_at,
            'reviewed_at' => ($request->status === 'approved' || $request->status === 'in_review') && !$enrollment->reviewed_at ? now() : $enrollment->reviewed_at,
        ]);

        // Si se completa la matrícula por asesor
        if ($request->status === 'completed') {
            $lead = Lead::where('email', $enrollment->student_email)
                ->orWhere('phone', $enrollment->student_phone)
                ->first();
            
            if ($lead && empty($lead->student_id)) {
                $lead->update(['student_id' => Lead::generateIcepId()]);
            }
        }

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id' => $request->user()->id,
            'action' => 'status_change',
            'old_status' => $oldStatus,
            'new_status' => $enrollment->status,
            'notes' => $request->notes,
        ]);

        // NOTIFICALIONES POR CAMBIO DE ESTADO
        if ($request->status === 'in_review') {
            // Se solicitó matrícula, notificar a los Super Admins
            $admins = User::whereHas('roles', function($q) {
                $q->where('name', 'admin');
            })->get();
            
            foreach ($admins as $admin) {
                /** @var \App\Models\User $admin */
                $admin->notify(new EnrollmentRequestedNotification($enrollment->load('advisor')));
            }
        }

        if ($request->status === 'approved') {
            // Matrícula aprobada, notificar al asesor
            /** @var \App\Models\User $advisor */
            $advisor = User::find($enrollment->advisor_id);
            if ($advisor) {
                $advisor->notify(new EnrollmentApprovedNotification($enrollment, $request->user()));
            }
        }

        return $this->success($enrollment->fresh(['advisor', 'course', 'paymentRequestedTo', 'paymentConfirmedBy']), 'Estado actualizado');
    }

    /**
     * Asesor sube comprobante de pago y selecciona jefe para la verificación.
     */
    public function submitPayment(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::findOrFail($id);

        // Solo el asesor dueño, jefe o admin puede hacer esto
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            if ($enrollment->advisor_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        if ($enrollment->status !== 'completed') {
            return $this->error('El formulario debe estar en estado completado para enviar el pago.', 422);
        }

        $request->validate([
            'bank_transaction_id'  => 'required|string|unique:enrollment_forms,bank_transaction_id',
            'payment_concept'      => 'required|string|max:50',
            'payment_voucher'      => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'payment_requested_to' => 'required|exists:users,id',
        ], [
            'bank_transaction_id.unique' => 'Este número de transacción ya fue registrado. Verifica el comprobante.',
            'payment_concept.required'   => 'Debes indicar el concepto del pago.',
            'payment_voucher.required'   => 'Debes subir el comprobante de pago.',
            'payment_voucher.mimes'      => 'El comprobante debe ser una imagen (JPG, PNG) o PDF.',
            'payment_voucher.max'        => 'El archivo no puede superar los 5 MB.',
        ]);

        // Guardar el archivo
        $path = $request->file('payment_voucher')->store('payment_vouchers', 'public');

        $oldStatus = $enrollment->status;
        $enrollment->update([
            'status'               => 'payment_pending',
            'bank_transaction_id'  => $request->bank_transaction_id,
            'payment_concept'      => $request->payment_concept,
            'payment_voucher_path' => $path,
            'payment_requested_to' => $request->payment_requested_to,
        ]);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id'            => $request->user()->id,
            'action'             => 'payment_submitted',
            'old_status'         => $oldStatus,
            'new_status'         => 'payment_pending',
            'notes'              => 'Comprobante enviado. N° Transacción: ' . $request->bank_transaction_id,
        ]);

        // Notificar al jefe seleccionado
        /** @var \App\Models\User $jefe */
        $jefe = User::find($request->payment_requested_to);
        if ($jefe) {
            $jefe->notify(new PaymentRequestedNotification(
                $enrollment->load('course'),
                $request->user()
            ));
        }

        return $this->success($enrollment->fresh(['advisor', 'course', 'paymentRequestedTo']), 'Comprobante enviado. El jefe será notificado.');
    }

    /**
     * Jefe o Admin confirma o rechaza el pago.
     */
    public function confirmPayment(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::with(['advisor', 'course'])->findOrFail($id);

        // Restricción estricta: Solo el jefe al que se le solicitó puede confirmar
        if ((int)$enrollment->payment_requested_to !== (int)$request->user()->id) {
            return response()->json(['message' => 'No autorizado. Solo el Jefe específicamente asignado a esta verificación puede confirmar el pago.'], 403);
        }

        if ($enrollment->status !== 'payment_pending') {
            return $this->error('El expediente no está en estado de verificación de pago.', 422);
        }

        $request->validate([
            'action' => 'required|in:confirm,reject',
            'notes'  => 'nullable|string',
        ]);

        $newStatus = $request->action === 'confirm' ? 'payment_confirmed' : 'completed';
        $oldStatus = $enrollment->status;

        $updateData = [
            'status' => $newStatus,
        ];
        if ($request->action === 'confirm') {
            $updateData['payment_confirmed_by'] = $request->user()->id;
            $updateData['payment_confirmed_at'] = now();
        } else {
            // Al rechazar, limpiar datos del pago para que el asesor pueda reintentar
            $updateData['bank_transaction_id']  = null;
            $updateData['payment_voucher_path'] = null;
            $updateData['payment_requested_to'] = null;
        }

        $enrollment->update($updateData);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id'            => $request->user()->id,
            'action'             => $request->action === 'confirm' ? 'payment_confirmed' : 'payment_rejected',
            'old_status'         => $oldStatus,
            'new_status'         => $newStatus,
            'notes'              => $request->notes ?? ($request->action === 'confirm' ? 'Pago verificado y confirmado.' : 'Pago rechazado. El asesor debe reintentar.'),
        ]);

        // Notificar al asesor
        /** @var \App\Models\User $advisor */
        $advisor = User::find($enrollment->advisor_id);
        if ($advisor) {
            if ($request->action === 'confirm') {
                $advisor->notify(new PaymentConfirmedNotification($enrollment, $request->user()));
            } else {
                // Reutilizamos EnrollmentCompletedNotification con un mensaje de rechazo
                // (podríamos crear otra, pero para simplificar)
                $advisor->notify(new EnrollmentCompletedNotification($enrollment));
            }
        }

        return $this->success(
            $enrollment->fresh(['advisor', 'course', 'paymentRequestedTo', 'paymentConfirmedBy']),
            $request->action === 'confirm' ? 'Pago confirmado. El asesor puede proceder.' : 'Pago rechazado. El asesor fue notificado.'
        );
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::findOrFail($id);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_asesores')) {
            if ($enrollment->advisor_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
            if (!in_array($enrollment->status, ['pending_send', 'sent'])) {
                return response()->json(['message' => 'No se puede eliminar un formulario que ya fue llenado/procesado'], 403);
            }
        }

        $enrollment->delete();
        return $this->success(null, 'Formulario anulado (soft-delete)');
    }

    // PUBLIC ROUTES
    public function showPublic($uuid): JsonResponse
    {
        $enrollment = EnrollmentForm::with(['course'])->where('uuid', $uuid)->firstOrFail();
        return $this->success($enrollment);
    }

    public function submitPublic(Request $request, $uuid): JsonResponse
    {
        $request->validate([
            'student_name' => 'required|string',
            'student_email' => 'required|email',
            'student_phone' => 'required|string',
            'student_id_number' => 'required|string',
            'student_city' => 'required|string',
        ]);

        $enrollment = EnrollmentForm::where('uuid', $uuid)->firstOrFail();

        if ($enrollment->status === 'completed' || $enrollment->status === 'approved') {
            return $this->error('Este formulario ya ha sido completado.', 400);
        }

        $oldStatus = $enrollment->status;
        
        $enrollment->update([
            'student_name' => $request->student_name,
            'student_email' => $request->student_email,
            'student_phone' => $request->student_phone,
            'student_id_number' => $request->student_id_number,
            'student_city' => $request->student_city,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id' => null, // action by student
            'action' => 'student_submitted',
            'old_status' => $oldStatus,
            'new_status' => 'completed',
            'notes' => 'El estudiante completó la información',
        ]);

        // ==========================================
        // CIERRE AUTOMÁTICO DEL LEAD EN EL CRM
        // ==========================================
        $lead = null;
        if ($enrollment->lead_id) {
            $lead = Lead::find($enrollment->lead_id);
        } else {
            $searchEmail = $enrollment->student_email ?? $request->student_email;
            $searchPhone = $enrollment->student_phone ?? $request->student_phone;
            
            $lead = Lead::where(function ($q) use ($searchEmail, $searchPhone) {
                    if ($searchEmail) $q->where('email', $searchEmail);
                    if ($searchPhone) $q->orWhere('phone', $searchPhone);
                })
                ->where('advisor_id', $enrollment->advisor_id)
                ->first();
        }

        if ($lead) {
            // Update existing lead since they enrolled
            $lead->update([
                'name' => $request->student_name,
                'id_number' => $request->student_id_number,
                'city' => $request->student_city,
                'status' => 'closed_won' // Movido automáticamente a venta cerrada
            ]);
            
            // Generar ID de estudiante solo al completar la matrícula
            if (empty($lead->student_id)) {
                $lead->update(['student_id' => Lead::generateIcepId()]);
            }
            
            LeadInteraction::create([
                'lead_id' => $lead->id,
                'user_id' => $enrollment->advisor_id,
                'type' => 'email', // Or web form
                'result' => 'sold',
                'notes' => 'El cliente llenó su matrícula y finalizó el proceso de compra. Curso: ' . ($enrollment->course->name ?? 'N/A'),
                'interacted_at' => now(),
            ]);
        }

        $advisor = User::find($enrollment->advisor_id);

        if ($advisor) {
            $advisor->notify(new EnrollmentCompletedNotification($enrollment));
        }

        return $this->success($enrollment, 'Formulario enviado correctamente');
    }

    public function export(Request $request)
    {
        $query = EnrollmentForm::with(['advisor', 'course']);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_asesores')) {
            $query->where('advisor_id', $request->user()->id);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $enrollments = $query->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="informe_matriculas_' . now()->format('Ymd_His') . '.csv"',
        ];

        $callback = function () use ($enrollments) {
            $file = fopen('php://output', 'w');
            // Add BOM for Excel UTF-8 compatibility
            fputs($file, "\xEF\xBB\xBF");
            
            fputcsv($file, [
                'ID',
                'Fecha',
                'Estudiante',
                'Email',
                'Teléfono',
                'Cédula/ID',
                'Ciudad',
                'Curso',
                'Asesor',
                'Estado',
                'Fecha Envío',
                'Fecha Completado',
            ], ';');

            foreach ($enrollments as $enrollment) {
                fputcsv($file, [
                    $enrollment->id,
                    $enrollment->created_at->format('Y-m-d H:i:s'),
                    $enrollment->student_name ?? 'N/A',
                    $enrollment->student_email ?? 'N/A',
                    $enrollment->student_phone ?? 'N/A',
                    $enrollment->student_id_number ?? 'N/A',
                    $enrollment->student_city ?? 'N/A',
                    $enrollment->course->name ?? 'N/A',
                    $enrollment->advisor->name ?? 'N/A',
                    $enrollment->status,
                    $enrollment->sent_at ? $enrollment->sent_at->format('Y-m-d H:i:s') : 'N/A',
                    $enrollment->completed_at ? $enrollment->completed_at->format('Y-m-d H:i:s') : 'N/A',
                ], ';');
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
