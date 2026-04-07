<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends ApiController
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles');

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->latest()->get();

        return $this->success($users, 'Usuarios recuperados');
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:4',
            'roles' => 'required|array',
            'id_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'avatar' => 'nullable|string|max:255',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'id_number' => $request->id_number,
            'phone' => $request->phone,
            'avatar' => $request->avatar,
        ]);

        if ($request->has('roles')) {
            $user->assignRole($request->roles);
        }

        return $this->success($user->load('roles'), 'Usuario creado exitosamente', 201);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user): JsonResponse
    {
        return $this->success($user->load('roles', 'permissions'));
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'name' => 'string|max:255',
            'email' => 'string|email|max:255|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:4',
            'roles' => 'array',
            'id_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'avatar' => 'nullable|string|max:255',
        ]);

        $user->update($request->only('name', 'email', 'id_number', 'phone', 'avatar'));

        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        if ($request->has('roles')) {
            $user->syncRoles($request->roles);
        }

        return $this->success($user->load('roles'), 'Usuario actualizado exitosamente');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();
        return $this->success(null, 'Usuario eliminado exitosamente');
    }
}
