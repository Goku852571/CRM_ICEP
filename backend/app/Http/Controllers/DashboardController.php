<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DashboardController extends ApiController
{
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Dynamic stats by role
        if ($user->hasRole('admin') || $user->hasRole('jefe')) {
            $overview = [
                ['label' => 'Personal Total', 'value' => User::count(), 'icon' => 'Users', 'color' => 'blue'],
                ['label' => 'Roles Activos', 'value' => Role::count(), 'icon' => 'Shield', 'color' => 'purple'],
                ['label' => 'Permisos Sistema', 'value' => Permission::count(), 'icon' => 'Key', 'color' => 'orange'],
                ['label' => 'Tickets Abiertos', 'value' => \App\Models\Ticket::where('status', 'open')->count(), 'icon' => 'Ticket', 'color' => 'green'],
            ];
            $recent_activity = User::with('roles')->latest()->take(5)->get()->map(function($u) {
                return [
                    'id' => $u->id,
                    'user' => $u->name,
                    'action' => 'Se unió al equipo',
                    'time' => $u->created_at->diffForHumans(),
                    'roles' => $u->roles->pluck('name'),
                ];
            });
        } else {
            $overview = [
                ['label' => 'Mis Leads', 'value' => \App\Models\Lead::where('advisor_id', $user->id)->count(), 'icon' => 'Users', 'color' => 'blue'],
                ['label' => 'Mis Tickets', 'value' => \App\Models\Ticket::where('requester_id', $user->id)->orWhere('assignee_id', $user->id)->count(), 'icon' => 'Ticket', 'color' => 'green'],
                ['label' => 'Mis Matrículas', 'value' => \App\Models\EnrollmentForm::where('advisor_id', $user->id)->count(), 'icon' => 'FileText', 'color' => 'purple'],
            ];
            $recent_activity = \App\Models\LeadInteraction::with('lead')->where('user_id', $user->id)->latest()->take(5)->get()->map(function($interaction) {
                return [
                    'id' => $interaction->id,
                    'user' => $interaction->lead->name ?? 'Lead eliminado',
                    'action' => 'Interacción: ' . $interaction->type,
                    'time' => $interaction->created_at->diffForHumans(),
                    'roles' => ['Lead'],
                ];
            });
        }

        $data = [
            'overview' => $overview,
            'recent_activity' => $recent_activity,
            'chart_data' => [
                ['name' => 'Lun', 'tickets' => 12, 'enrollments' => 5],
                ['name' => 'Mar', 'tickets' => 19, 'enrollments' => 8],
                ['name' => 'Mie', 'tickets' => 15, 'enrollments' => 12],
                ['name' => 'Jue', 'tickets' => 22, 'enrollments' => 15],
                ['name' => 'Vie', 'tickets' => 30, 'enrollments' => 20],
                ['name' => 'Sab', 'tickets' => 10, 'enrollments' => 4],
                ['name' => 'Dom', 'tickets' => 5, 'enrollments' => 2],
            ]
        ];

        return $this->success($data);
    }
}
