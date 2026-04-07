<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class AuthController extends ApiController
{
    /**
     * Handle an authentication attempt.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return $this->error('Credenciales incorrectas.', 401);
        }

        $user = Auth::user();
        
        // Remove old tokens by same device name, or just keep creating new ones.
        // We will create a fresh one for this session.
        $token = $user->createToken($request->device_name ?? 'web-login')->plainTextToken;

        $user->getAllPermissions(); // Pre-load all permissions
        
        return $this->success([
            'user' => $user->load('roles'),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'token' => $token,
        ], 'Login exitoso');
    }

    /**
     * Get the authenticated User's info including roles and permissions.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->getAllPermissions();

        return $this->success([
            'user' => $user->load('roles'),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $request->validate([
            'name' => 'string|max:255',
            'email' => 'string|email|max:255|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:4',
            'id_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $data = $request->only('name', 'email', 'id_number', 'phone');

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('avatars', 'public');
            $data['avatar'] = \Illuminate\Support\Facades\Storage::url($path);
        }

        $user->update($data);

        if ($request->filled('password')) {
            $user->update(['password' => \Illuminate\Support\Facades\Hash::make($request->password)]);
        }

        return $this->success([
            'user' => $user->load('roles'),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ], 'Perfil actualizado correctamente');
    }

    /**
     * Log the user out (Invalidate the token).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(null, 'Logout exitoso');
    }
}
