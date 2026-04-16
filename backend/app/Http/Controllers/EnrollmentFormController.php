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
        $query = EnrollmentForm::with(['advisor', 'course', 'payments.paymentRequestedTo'])
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
            'paymentRequestedTo', 'paymentConfirmedBy', 'payments.paymentRequestedTo'
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

    public function submitPayment(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::findOrFail($id);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            if ($enrollment->advisor_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        // Ya no impedimos que sea diferente de 'completed'. Podría ser 'payment_pending', 'partial' etc.
        // Pero sí validamos que no esté en estados iniciales
        if (in_array($enrollment->status, ['pending_send', 'sent'])) {
            return $this->error('Formulario no ha sido completado por el cliente.', 422);
        }

        $request->validate([
            'installment_number'   => 'required|integer|min:1',
            'bank_transaction_id'  => 'required|string|unique:enrollment_payments,bank_transaction_id',
            'amount'               => 'required|numeric|min:0.01',
            'payment_voucher'      => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'payment_requested_to' => 'required|exists:users,id',
            'sale_value'           => 'nullable|numeric|min:0',
            'requires_billing'     => 'nullable|boolean',
            'bank_name'            => 'nullable|string',
        ], [
            'bank_transaction_id.unique' => 'Este número de transacción ya fue registrado. Verifica el comprobante.',
            'payment_voucher.required'   => 'Debes subir el comprobante de pago.',
            'payment_voucher.mimes'      => 'El comprobante debe ser una imagen (JPG, PNG) o PDF.',
            'amount.required'            => 'Debes ingresar el monto a pagar.',
        ]);

        // Validar que la cuota no esté ya confirmada
        $existingConfirmed = $enrollment->payments()
            ->where('installment_number', $request->installment_number)
            ->where('status', 'confirmed')
            ->exists();

        if ($existingConfirmed) {
            return $this->error('Esta cuota ya ha sido pagada y confirmada. No se puede subir información adicional.', 422);
        }


        if ($request->filled('sale_value') && !$enrollment->sale_value) {
            $course = $enrollment->course;
            if ($course && $request->sale_value < $course->min_price) {
                return $this->error('El valor de venta no puede ser inferior a la Inversión Mínima (' . $course->min_price . ').', 422);
            }
        }

        $path = $request->file('payment_voucher')->store('payment_vouchers', 'public');

        $updates = [];
        if (!in_array($enrollment->status, ['approved', 'in_review'])) {
             // Si aún no está aprobada formalmente la matrícula, lo dejamos en verificando.
             $updates['status'] = 'payment_pending';
        }
        
        if ($request->filled('sale_value') && !$enrollment->sale_value) {
            $updates['sale_value'] = $request->sale_value;
            $updates['balance_due'] = $request->sale_value - ($enrollment->total_paid ?? 0);
        }
        if ($request->filled('requires_billing')) {
            $updates['requires_billing'] = filter_var($request->requires_billing, FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->filled('bank_name') && !$enrollment->bank_name) {
            $updates['bank_name'] = $request->bank_name;
        }
        // Save the latest voucher to the form itself for legacy view (can be removed later)
        $updates['bank_transaction_id'] = $request->bank_transaction_id;
        $updates['payment_voucher_path'] = $path;
        $updates['payment_requested_to'] = $request->payment_requested_to;
        $updates['payment_concept'] = 'Cuota ' . $request->installment_number;

        $enrollment->update($updates);

        $payment = $enrollment->payments()->create([
            'amount'               => $request->amount,
            'installment_number'   => $request->installment_number,
            'bank_transaction_id'  => $request->bank_transaction_id,
            'payment_voucher_path' => $path,
            'payment_concept'      => 'Cuota ' . $request->installment_number,
            'bank_name'            => $request->filled('bank_name') ? $request->bank_name : $enrollment->bank_name,
            'status'               => 'pending_verification',
            'payment_requested_to' => $request->payment_requested_to,
        ]);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id'            => $request->user()->id,
            'action'             => 'payment_submitted',
            'old_status'         => $enrollment->getOriginal('status'),
            'new_status'         => $enrollment->status,
            'notes'              => 'Comprobante de $' . $request->amount . ' enviado para Cuota ' . $request->installment_number . '. N° TXN: ' . $request->bank_transaction_id,
        ]);

        /** @var \App\Models\User $jefe */
        $jefe = User::find($request->payment_requested_to);
        if ($jefe) {
            $jefe->notify(new PaymentRequestedNotification($enrollment->load('course'), $request->user()));
        }

        return $this->success($enrollment->fresh(['advisor', 'course', 'paymentRequestedTo', 'payments']), 'Comprobante enviado. Su estado es "En Validación".');
    }

    /**
     * Jefe o Admin confirma o rechaza el pago global del expediente o múltiples pagos pendientes.
     * En este caso confirmaremos todos los pagos pendientes dirigidos a este jefe.
     */
    public function confirmPayment(Request $request, $id): JsonResponse
    {
        $enrollment = EnrollmentForm::with(['advisor', 'course', 'payments'])->findOrFail($id);

        $pendingPayments = $enrollment->payments()
            ->where('status', 'pending_verification')
            ->where('payment_requested_to', $request->user()->id)
            ->get();

        if ($pendingPayments->isEmpty()) {
             // Tratamos de buscar pagos que pueda aprobar como admin si aplica
             if ($request->user()->hasRole('admin')) {
                 $pendingPayments = $enrollment->payments()->where('status', 'pending_verification')->get();
             }
        }

        if ($pendingPayments->isEmpty()) {
            return $this->error('No tienes pagos pendientes de verificación asociados a este expediente.', 422);
        }

        $request->validate([
            'action' => 'required|in:confirm,reject',
            'notes'  => 'nullable|string',
        ]);

        $oldStatus = $enrollment->status;
        $totalApprovedInThisRequest = 0;

        foreach ($pendingPayments as $p) {
            $p->update([
                'status' => $request->action === 'confirm' ? 'confirmed' : 'rejected',
                'payment_confirmed_by' => $request->user()->id,
                'payment_confirmed_at' => now(),
            ]);
            if ($request->action === 'confirm') {
                $totalApprovedInThisRequest += $p->amount;
            }
        }

        // Recalcular saldo total pagado solo basados en pagos confirmados reales
        $totalPaid = $enrollment->payments()->where('status', 'confirmed')->sum('amount');
        $saleValue = $enrollment->sale_value ?? 0;
        $balance = max(0, $saleValue - $totalPaid);
        
        $newFormStatus = $enrollment->status;
        if ($request->action === 'confirm') {
            if ($enrollment->status === 'payment_pending') {
                $newFormStatus = 'payment_confirmed'; 
            }
        } else {
             // Si era payment_pending y rechazamos todo lo que había, podemos retrocederlo
             $remainingPending = $enrollment->payments()->where('status', 'pending_verification')->count();
             if ($remainingPending === 0 && $totalPaid == 0) {
                 $newFormStatus = 'completed';
             }
        }

        $enrollment->update([
            'status' => $newFormStatus,
            'total_paid' => $totalPaid,
            'balance_due' => $balance,
        ]);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id'            => $request->user()->id,
            'action'             => $request->action === 'confirm' ? 'payment_confirmed' : 'payment_rejected',
            'old_status'         => $oldStatus,
            'new_status'         => $newFormStatus,
            'notes'              => $request->notes ?? ($request->action === 'confirm' ? 'Pago(s) verificado(s) y sumado al saldo.' : 'Pago(s) rechazado(s).'),
        ]);

        $advisor = User::find($enrollment->advisor_id);
        if ($advisor) {
            if ($request->action === 'confirm') {
                $advisor->notify(new PaymentConfirmedNotification($enrollment, $request->user()));
            } else {
                $advisor->notify(new EnrollmentCompletedNotification($enrollment));
            }
        }

        return $this->success(
            $enrollment->fresh(['advisor', 'course', 'payments', 'paymentRequestedTo', 'paymentConfirmedBy']),
            $request->action === 'confirm' ? 'Pago verificado y sumado al saldo.' : 'Pago rechazado.'
        );
    }

    public function updatePayment(Request $request, $id, $paymentId): JsonResponse
    {
        $enrollment = EnrollmentForm::findOrFail($id);
        $payment = $enrollment->payments()->findOrFail($paymentId);

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe')) {
            if ($enrollment->advisor_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        $request->validate([
            'bank_transaction_id' => 'required|string',
            'amount'              => 'required|numeric|min:0.01',
            'bank_name'           => 'nullable|string',
        ]);

        // Log the change
        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id'            => $request->user()->id,
            'action'             => 'payment_edited',
            'old_status'         => $enrollment->status,
            'new_status'         => $enrollment->status,
            'notes'              => "Pago ID {$payment->id} editado. Anterior: {$payment->amount} (TXN: {$payment->bank_transaction_id})",
        ]);

        $payment->update($request->only(['bank_transaction_id', 'amount', 'bank_name']));

        // Recalcular saldo
        $totalPaid = $enrollment->payments()->where('status', 'confirmed')->sum('amount');
        $enrollment->update([
            'total_paid' => $totalPaid,
            'balance_due' => ($enrollment->sale_value ?? 0) - $totalPaid,
        ]);

        return $this->success($enrollment->fresh(['payments']), 'Pago actualizado correctamente.');
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
