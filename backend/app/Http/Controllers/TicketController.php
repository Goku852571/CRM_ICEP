<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketHistory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use App\Notifications\TicketAssignedNotification;
use App\Notifications\TicketStatusUpdatedNotification;

class TicketController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['area', 'requester', 'assignee'])
            ->orderBy('priority', 'desc')
            ->orderBy('position', 'asc');

        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_departamento')) {
            $query->where(function($q) use($request) {
                $q->where('requester_id', $request->user()->id)
                  ->orWhere('assignee_id', $request->user()->id);
            });
        }

        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('assignee_id')) {
            $query->where('assignee_id', $request->assignee_id);
        }

        return $this->success($query->get(), 'Tickets recuperados');
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'area_id' => 'required|exists:areas,id',
            'assignee_id' => 'nullable|exists:users,id',
            'priority' => 'in:normal,urgent,priority',
        ]);

        $maxPosition = Ticket::where('area_id', $request->area_id)
            ->where('status', '!=', 'closed')
            ->max('position');

        $ticket = Ticket::create([
            'title' => $request->title,
            'description' => $request->description,
            'area_id' => $request->area_id,
            'requester_id' => $request->user()->id,
            'assignee_id' => $request->assignee_id,
            'priority' => $request->priority ?? 'normal',
            'status' => 'open',
            'position' => $maxPosition ? $maxPosition + 1 : 1,
        ]);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'action' => 'created',
            'new_value' => 'Ticket creado',
            'reason' => 'Creación inicial',
        ]);

        if ($request->assignee_id && $request->assignee_id !== $request->user()->id) {
            $assignee = User::find($request->assignee_id);
            if ($assignee) {
                $assignee->notify(new TicketAssignedNotification($ticket));
            }
        }

        return $this->success($ticket->load(['area', 'requester', 'assignee']), 'Ticket creado exitosamente', 201);
    }

    public function show(Request $request, Ticket $ticket): JsonResponse
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_departamento')) {
            if ($ticket->requester_id !== $request->user()->id && $ticket->assignee_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }
        return $this->success($ticket->load(['area', 'requester', 'assignee', 'histories.user']));
    }

    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_departamento')) {
            if ($ticket->requester_id !== $request->user()->id && $ticket->assignee_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        $request->validate([
            'title' => 'string|max:255',
            'description' => 'string',
            'area_id' => 'exists:areas,id',
            'assignee_id' => 'nullable|exists:users,id',
        ]);

        $ticket->update($request->only('title', 'description', 'area_id', 'assignee_id'));

        return $this->success($ticket->load(['area', 'requester', 'assignee']), 'Ticket actualizado');
    }

    public function updateStatus(Request $request, Ticket $ticket): JsonResponse
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_departamento')) {
            if ($ticket->requester_id !== $request->user()->id && $ticket->assignee_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        $request->validate([
            'status' => 'required|in:open,in_progress,paused,closed,cancelled',
            'reason' => 'required|string',
        ]);

        $oldStatus = $ticket->status;
        $ticket->update(['status' => $request->status]);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'action' => 'status_change',
            'old_value' => $oldStatus,
            'new_value' => $ticket->status,
            'reason' => $request->reason,
        ]);

        if ($ticket->requester_id !== $request->user()->id) {
            $requester = User::find($ticket->requester_id);
            if ($requester) {
                $requester->notify(new TicketStatusUpdatedNotification($ticket, $oldStatus, $request->status));
            }
        }
        
        if ($ticket->assignee_id && $ticket->assignee_id !== $request->user()->id) {
            $assignee = User::find($ticket->assignee_id);
            if ($assignee) {
                $assignee->notify(new TicketStatusUpdatedNotification($ticket, $oldStatus, $request->status));
            }
        }

        return $this->success($ticket, 'Estado actualizado');
    }
    
    public function updatePriority(Request $request, Ticket $ticket): JsonResponse
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_departamento')) {
            if ($ticket->requester_id !== $request->user()->id && $ticket->assignee_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        $request->validate([
            'priority' => 'required|in:normal,urgent,priority',
            'reason' => 'required|string',
        ]);

        $oldPriority = $ticket->priority;
        $ticket->update(['priority' => $request->priority]);

        TicketHistory::create([
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'action' => 'priority_change',
            'old_value' => $oldPriority,
            'new_value' => $ticket->priority,
            'reason' => $request->reason,
        ]);

        return $this->success($ticket, 'Prioridad actualizada');
    }

    public function destroy(Request $request, Ticket $ticket): JsonResponse
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->hasRole('jefe') && !$request->user()->hasRole('jefe_departamento')) {
            if ($ticket->requester_id !== $request->user()->id) {
                return response()->json(['message' => 'No autorizado'], 403);
            }
        }

        $ticket->delete();
        return $this->success(null, 'Ticket eliminado');
    }
}
