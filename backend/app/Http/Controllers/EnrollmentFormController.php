<?php

namespace App\Http\Controllers;

use App\Models\EnrollmentForm;
use App\Models\EnrollmentFormHistory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use App\Models\User;
use App\Notifications\EnrollmentCompletedNotification;

class EnrollmentFormController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = EnrollmentForm::with(['advisor', 'course'])
            ->orderBy('created_at', 'desc');

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
        ]);

        $enrollment = EnrollmentForm::create([
            'uuid' => (string) Str::uuid(),
            'advisor_id' => $request->advisor_id,
            'course_id' => $request->course_id,
            'student_name' => $request->student_name,
            'student_email' => $request->student_email,
            'student_phone' => $request->student_phone,
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

    public function show($id): JsonResponse
    {
        $enrollment = EnrollmentForm::with(['advisor', 'course', 'histories.user'])->findOrFail($id);
        return $this->success($enrollment);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending_send,sent,completed,in_review,approved,incomplete,void',
            'notes' => 'nullable|string'
        ]);

        $enrollment = EnrollmentForm::findOrFail($id);
        $oldStatus = $enrollment->status;
        $enrollment->update([
            'status' => $request->status,
            'sent_at' => $request->status === 'sent' && !$enrollment->sent_at ? now() : $enrollment->sent_at,
            'completed_at' => $request->status === 'completed' && !$enrollment->completed_at ? now() : $enrollment->completed_at,
            'reviewed_at' => ($request->status === 'approved' || $request->status === 'in_review') && !$enrollment->reviewed_at ? now() : $enrollment->reviewed_at,
        ]);

        EnrollmentFormHistory::create([
            'enrollment_form_id' => $enrollment->id,
            'user_id' => $request->user()->id,
            'action' => 'status_change',
            'old_status' => $oldStatus,
            'new_status' => $enrollment->status,
            'notes' => $request->notes,
        ]);

        return $this->success($enrollment, 'Estado actualizado');
    }

    public function destroy($id): JsonResponse
    {
        $enrollment = EnrollmentForm::findOrFail($id);
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

        $advisor = User::find($enrollment->advisor_id);
        if ($advisor) {
            $advisor->notify(new EnrollmentCompletedNotification($enrollment));
        }

        return $this->success($enrollment, 'Formulario enviado correctamente');
    }
}
