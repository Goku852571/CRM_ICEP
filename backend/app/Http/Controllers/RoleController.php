<?php

namespace App\Http\Controllers;

use Spatie\Permission\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends ApiController
{
    /**
     * Display a listing of the roles.
     */
    public function index(): JsonResponse
    {
        $roles = Role::with('permissions')->get();
        return $this->success($roles, 'Roles recuperados');
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role): JsonResponse
    {
        return $this->success($role->load('permissions'));
    }
}
