<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseAttachment;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class CourseController extends ApiController
{
    // ── INDEX ────────────────────────────────────────────────────────
    public function index(Request $request): JsonResponse
    {
        $query = Course::with(['area', 'creator', 'attachments', 'catalogItems']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $courses = $query->latest()->get();

        return $this->success($courses, 'Cursos recuperados');
    }

    // ── STORE ────────────────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        // Handle JSON fields from FormData
        foreach (['schedules', 'catalog_items', 'practice_city'] as $field) {
            if ($request->has($field) && is_string($request->$field)) {
                $request->merge([$field => json_decode($request->$field, true)]);
            }
        }

        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'area_id'     => 'nullable|exists:areas,id',
            'price'       => 'nullable|numeric|min:0',
            'status'      => 'required|in:draft,active,inactive,finished,archived',
            'start_date'  => 'nullable|date',
            'cover_image' => 'nullable|image|max:5120', // 5MB
            'practice_city' => 'nullable|array',
            'duration'     => 'nullable|string|max:255',
            'min_price'    => 'nullable|numeric|min:0',
            'discount'     => 'nullable|numeric|min:0',
            'enrollment_value'   => 'nullable|numeric|min:0',
            'installments_count' => 'nullable|integer|min:0',
            'installment_value'  => 'nullable|numeric|min:0',
            'min_installment_value' => 'nullable|numeric|min:0',
            'schedules'    => 'nullable|array',
            'catalog_items' => 'nullable|array',
            'catalog_items.*' => 'exists:course_catalog_items,id',
        ]);

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('courses/covers', 'public');
        }

        $course = Course::create([
            'name'          => $request->name,
            'description'   => $request->description,
            'area_id'       => $request->area_id,
            'price'         => $request->price ?? 0,
            'status'        => $request->status,
            'start_date'    => $request->start_date,
            'cover_image'   => $coverPath,
            'created_by'    => $request->user()->id,
            'practice_city' => $request->practice_city,
            'duration'      => $request->duration,
            'min_price'     => $request->min_price ?? 0,
            'discount'      => $request->discount ?? 0,
            'enrollment_value'   => $request->enrollment_value ?? 0,
            'installments_count' => $request->installments_count ?? 0,
            'installment_value'  => $request->installment_value ?? 0,
            'min_installment_value' => $request->min_installment_value ?? 0,
            'schedules'     => $request->schedules,
        ]);

        // Auto-create calendar event if start_date provided
        if ($course->start_date) {
            Event::create([
                'title'      => 'Inicio de Curso: ' . $course->name,
                'description' => $course->description,
                'start_date' => $course->start_date,
                'end_date'   => $course->start_date,
                'color'      => '#10B981',
                'user_id'    => $request->user()->id,
            ]);
        }

        if ($request->has('catalog_items')) {
            $course->catalogItems()->sync($request->catalog_items);
        }

        return $this->success($course->load(['area', 'creator', 'attachments', 'catalogItems']), 'Curso creado', 201);
    }

    // ── SHOW ─────────────────────────────────────────────────────────
    public function show(Course $course): JsonResponse
    {
        return $this->success(
            $course->load(['area', 'creator', 'attachments', 'questions.asker', 'questions.answerer', 'catalogItems']),
            'Curso encontrado'
        );
    }

    // ── UPDATE ───────────────────────────────────────────────────────
    public function update(Request $request, Course $course): JsonResponse
    {
        // Handle JSON fields from FormData
        foreach (['schedules', 'catalog_items', 'practice_city'] as $field) {
            if ($request->has($field) && is_string($request->$field)) {
                $request->merge([$field => json_decode($request->$field, true)]);
            }
        }

        $request->validate([
            'name'        => 'string|max:255',
            'description' => 'nullable|string',
            'area_id'     => 'nullable|exists:areas,id',
            'price'       => 'nullable|numeric|min:0',
            'status'      => 'in:draft,active,inactive,finished,archived',
            'start_date'  => 'nullable|date',
            'cover_image' => 'nullable|image|max:5120',
            'practice_city' => 'nullable|array',
            'duration'     => 'nullable|string|max:255',
            'min_price'    => 'nullable|numeric|min:0',
            'discount'     => 'nullable|numeric|min:0',
            'enrollment_value'   => 'nullable|numeric|min:0',
            'installments_count' => 'nullable|integer|min:0',
            'installment_value'  => 'nullable|numeric|min:0',
            'min_installment_value' => 'nullable|numeric|min:0',
            'schedules'    => 'nullable|array',
            'catalog_items' => 'nullable|array',
            'catalog_items.*' => 'exists:course_catalog_items,id',
        ]);

        $data = $request->only([
            'name', 'description', 'area_id', 'price', 'status', 'start_date',
            'practice_city', 'duration', 'min_price', 'discount', 'schedules',
            'enrollment_value', 'installments_count', 'installment_value', 'min_installment_value'
        ]);

        if ($request->hasFile('cover_image')) {
            if ($course->cover_image) {
                Storage::disk('public')->delete($course->cover_image);
            }
            $data['cover_image'] = $request->file('cover_image')->store('courses/covers', 'public');
        }

        $course->update($data);

        if ($request->has('catalog_items')) {
            $course->catalogItems()->sync($request->catalog_items);
        }

        return $this->success($course->load(['area', 'creator', 'attachments', 'catalogItems']), 'Curso actualizado');
    }

    // ── DESTROY ──────────────────────────────────────────────────────
    public function destroy(Course $course): JsonResponse
    {
        if ($course->cover_image) {
            Storage::disk('public')->delete($course->cover_image);
        }
        $course->delete();

        return $this->success(null, 'Curso eliminado');
    }

    // ── ATTACHMENTS ──────────────────────────────────────────────────
    public function storeAttachment(Request $request, Course $course): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:file,url',
            'file' => 'required_if:type,file|file|max:20480',
            'url'  => 'required_if:type,url|url',
        ]);

        $attachment = null;

        if ($request->type === 'file') {
            $path = $request->file('file')->store('courses/' . $course->id . '/attachments', 'public');
            $attachment = $course->attachments()->create([
                'name'      => $request->name,
                'type'      => 'file',
                'path'      => $path,
                'mime_type' => $request->file('file')->getMimeType(),
                'size'      => $request->file('file')->getSize(),
            ]);
        } else {
            $attachment = $course->attachments()->create([
                'name' => $request->name,
                'type' => 'url',
                'url'  => $request->url,
            ]);
        }

        return $this->success($attachment, 'Adjunto agregado', 201);
    }

    public function destroyAttachment(Course $course, CourseAttachment $attachment): JsonResponse
    {
        if ($attachment->type === 'file' && $attachment->path) {
            Storage::disk('public')->delete($attachment->path);
        }
        $attachment->delete();

        return $this->success(null, 'Adjunto eliminado');
    }

    // ── LIST (for enrollment dropdowns – active only) ────────────────
    public function listForEnrollment(): JsonResponse
    {
        $courses = Course::where('status', 'active')
            ->select('id', 'name', 'price', 'min_price', 'enrollment_value', 'installments_count', 'installment_value', 'min_installment_value')
            ->orderBy('name')
            ->get();

        return $this->success($courses, 'Cursos activos');
    }
}
