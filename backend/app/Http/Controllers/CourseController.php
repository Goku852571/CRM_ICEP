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
        $query = Course::with(['area', 'creator', 'attachments']);

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
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'area_id'     => 'nullable|exists:areas,id',
            'price'       => 'nullable|numeric|min:0',
            'status'      => 'required|in:draft,active,inactive,finished,archived',
            'start_date'  => 'nullable|date',
            'cover_image' => 'nullable|image|max:5120', // 5MB
        ]);

        $coverPath = null;
        if ($request->hasFile('cover_image')) {
            $coverPath = $request->file('cover_image')->store('courses/covers', 'public');
        }

        $course = Course::create([
            'name'        => $request->name,
            'description' => $request->description,
            'area_id'     => $request->area_id,
            'price'       => $request->price ?? 0,
            'status'      => $request->status,
            'start_date'  => $request->start_date,
            'cover_image' => $coverPath,
            'created_by'  => $request->user()->id,
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

        return $this->success($course->load(['area', 'creator', 'attachments']), 'Curso creado', 201);
    }

    // ── SHOW ─────────────────────────────────────────────────────────
    public function show(Course $course): JsonResponse
    {
        return $this->success(
            $course->load(['area', 'creator', 'attachments', 'questions.asker', 'questions.answerer']),
            'Curso encontrado'
        );
    }

    // ── UPDATE ───────────────────────────────────────────────────────
    public function update(Request $request, Course $course): JsonResponse
    {
        $request->validate([
            'name'        => 'string|max:255',
            'description' => 'nullable|string',
            'area_id'     => 'nullable|exists:areas,id',
            'price'       => 'nullable|numeric|min:0',
            'status'      => 'in:draft,active,inactive,finished,archived',
            'start_date'  => 'nullable|date',
            'cover_image' => 'nullable|image|max:5120',
        ]);

        $data = $request->only(['name', 'description', 'area_id', 'price', 'status', 'start_date']);

        if ($request->hasFile('cover_image')) {
            if ($course->cover_image) {
                Storage::disk('public')->delete($course->cover_image);
            }
            $data['cover_image'] = $request->file('cover_image')->store('courses/covers', 'public');
        }

        $course->update($data);

        return $this->success($course->load(['area', 'creator', 'attachments']), 'Curso actualizado');
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
            ->select('id', 'name', 'price')
            ->orderBy('name')
            ->get();

        return $this->success($courses, 'Cursos activos');
    }
}
