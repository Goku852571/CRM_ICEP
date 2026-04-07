<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\User;
use App\Notifications\EventModifiedNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use App\Jobs\SendEventReminderJob;
use Carbon\Carbon;

class EventController extends ApiController
{
    public function index(): JsonResponse
    {
        $events = Event::with(['creator', 'participants'])->get()->map(function($event) {
            if ($event->image_path) {
                $event->image_url = Storage::url($event->image_path);
            }
            return $event;
        });
        return $this->success($events, 'Eventos recuperados');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'color' => 'nullable|string|max:50',
            'icon' => 'nullable|string',
            'meeting_link' => 'nullable|string',
            'participant_ids' => 'nullable|string', // Stringified JSON or comma separated if sent via FormData
            'image' => 'nullable|image|max:2048',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('events', 'public');
        }

        // Handle participant_ids if sent as JSON string in FormData
        $participantIds = [];
        if ($request->has('participant_ids')) {
            $participantIds = json_decode($request->participant_ids, true) ?? explode(',', $request->participant_ids);
        }

        $event = Event::create([
            'title' => $request->title,
            'description' => $request->description,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'color' => $request->color ?? '#3B82F6',
            'icon' => $request->icon,
            'meeting_link' => $request->meeting_link,
            'image_path' => $imagePath,
            'user_id' => $request->user()->id,
        ]);

        if (!empty($participantIds)) {
            $event->participants()->sync($participantIds);
        }

        // Programar recordatorio (30 min antes)
        $reminderTime = Carbon::parse($event->start_date)->subMinutes(30);
        if ($reminderTime->isFuture()) {
            SendEventReminderJob::dispatch($event)->delay($reminderTime);
        }

        $usersToNotify = User::where('id', '!=', $request->user()->id)->get();
        Notification::send($usersToNotify, new EventModifiedNotification($event->title, 'creado'));

        return $this->success($event->load(['creator', 'participants']), 'Evento creado', 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        if (!$request->user()->hasRole('admin') && $event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado para editar este evento'], 403);
        }

        $validated = $request->validate([
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'date',
            'end_date' => 'date|after_or_equal:start_date',
            'color' => 'nullable|string|max:50',
            'icon' => 'nullable|string',
            'meeting_link' => 'nullable|string',
            'participant_ids' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            // Delete old image
            if ($event->image_path) {
                Storage::disk('public')->delete($event->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('events', 'public');
        }

        $event->update($validated);

        if ($request->has('participant_ids')) {
            $participantIds = json_decode($request->participant_ids, true) ?? explode(',', $request->participant_ids);
            $event->participants()->sync($participantIds);
        }

        // Re-programar recordatorio si cambió la fecha
        if ($request->has('start_date')) {
            $reminderTime = Carbon::parse($event->start_date)->subMinutes(30);
            if ($reminderTime->isFuture()) {
                SendEventReminderJob::dispatch($event)->delay($reminderTime);
            }
        }

        $usersToNotify = User::where('id', '!=', $request->user()->id)->get();
        Notification::send($usersToNotify, new EventModifiedNotification($event->title, 'actualizado'));

        return $this->success($event->load(['creator', 'participants']), 'Evento actualizado');
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        if (!$request->user()->hasRole('admin') && $event->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado para eliminar este evento'], 403);
        }

        $title = $event->title;
        $event->delete();

        $usersToNotify = User::where('id', '!=', $request->user()->id)->get();
        Notification::send($usersToNotify, new EventModifiedNotification($title, 'eliminado'));

        return $this->success(null, 'Evento eliminado');
    }
}
