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
        $data = [
            'overview' => [
                [
                    'label' => 'Personal Total',
                    'value' => User::count(),
                    'icon' => 'Users',
                    'color' => 'blue'
                ],
                [
                    'label' => 'Roles Activos',
                    'value' => Role::count(),
                    'icon' => 'Shield',
                    'color' => 'purple'
                ],
                [
                    'label' => 'Permisos Sistema',
                    'value' => Permission::count(),
                    'icon' => 'Key',
                    'color' => 'orange'
                ],
                [
                    'label' => 'Tickets Abiertos',
                    'value' => 0, // Mock for Sprint 2/3
                    'icon' => 'Ticket',
                    'color' => 'green'
                ],
            ],
            'recent_activity' => User::with('roles')->latest()->take(5)->get()->map(function($user) {
                return [
                    'id' => $user->id,
                    'user' => $user->name,
                    'action' => 'Se unió al equipo',
                    'time' => $user->created_at->diffForHumans(),
                    'roles' => $user->roles->pluck('name'),
                ];
            }),
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
