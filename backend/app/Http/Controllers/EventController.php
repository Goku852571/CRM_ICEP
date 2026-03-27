<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\User;
use App\Notifications\EventModifiedNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;

class EventController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->success(Event::with('creator')->get(), 'Eventos recuperados');
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'color' => 'nullable|string|max:50',
        ]);

        $event = Event::create([
            'title' => $request->title,
            'description' => $request->description,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'color' => $request->color ?? '#3B82F6',
            'user_id' => $request->user()->id,
        ]);

        $usersToNotify = User::where('id', '!=', $request->user()->id)->get();
        Notification::send($usersToNotify, new EventModifiedNotification($event->title, 'creado'));

        return $this->success($event->load('creator'), 'Evento creado', 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $event = Event::findOrFail($id);

        $request->validate([
            'title' => 'string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'date',
            'end_date' => 'date|after_or_equal:start_date',
            'color' => 'nullable|string|max:50',
        ]);

        $event->update($request->only('title', 'description', 'start_date', 'end_date', 'color'));

        $usersToNotify = User::where('id', '!=', $request->user()->id)->get();
        Notification::send($usersToNotify, new EventModifiedNotification($event->title, 'actualizado'));

        return $this->success($event->load('creator'), 'Evento actualizado');
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        $event = Event::findOrFail($id);
        $title = $event->title;
        $event->delete();

        $usersToNotify = User::where('id', '!=', $request->user()->id)->get();
        Notification::send($usersToNotify, new EventModifiedNotification($title, 'eliminado'));

        return $this->success(null, 'Evento eliminado');
    }
}
