<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CourseQuestionController extends ApiController
{
    public function index(Course $course): JsonResponse
    {
        return $this->success(
            $course->questions()->with(['asker', 'answerer'])->get(),
            'Preguntas recuperadas'
        );
    }

    public function store(Request $request, Course $course): JsonResponse
    {
        $request->validate([
            'question' => 'required|string|max:2000',
        ]);

        $question = $course->questions()->create([
            'user_id'  => $request->user()->id,
            'question' => $request->question,
            'status'   => 'pending',
        ]);

        return $this->success($question->load('asker'), 'Pregunta enviada', 201);
    }

    public function answer(Request $request, Course $course, CourseQuestion $question): JsonResponse
    {
        $request->validate([
            'answer' => 'required|string|max:5000',
            'status' => 'in:answered,closed',
        ]);

        $question->update([
            'answer'      => $request->answer,
            'answered_by' => $request->user()->id,
            'answered_at' => now(),
            'status'      => $request->status ?? 'answered',
        ]);

        return $this->success($question->fresh()->load(['asker', 'answerer']), 'Respuesta guardada');
    }

    public function destroy(Course $course, CourseQuestion $question): JsonResponse
    {
        $question->delete();
        return $this->success(null, 'Pregunta eliminada');
    }
}
