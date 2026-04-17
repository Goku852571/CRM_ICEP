<?php

namespace App\Http\Controllers;

use App\Models\SystemOption;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SystemOptionController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = SystemOption::query();

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('active')) {
            $query->where('is_active', (bool) $request->active);
        }

        return $this->success($query->orderBy('sort_order')->orderBy('label')->get());
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            return $this->error('No autorizado', 403);
        }

        $request->validate([
            'category' => 'required|string',
            'value' => 'required|string',
            'label' => 'required|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer'
        ]);

        $option = SystemOption::create($request->all());

        return $this->success($option, 'Opción creada', 201);
    }

    public function update(Request $request, SystemOption $systemOption): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            return $this->error('No autorizado', 403);
        }

        $request->validate([
            'category' => 'string',
            'value' => 'string',
            'label' => 'string',
            'is_active' => 'boolean',
            'sort_order' => 'integer'
        ]);

        $systemOption->update($request->all());

        return $this->success($systemOption, 'Opción actualizada');
    }

    public function destroy(Request $request, SystemOption $systemOption): JsonResponse
    {
        if (!$request->user()->hasRole('admin')) {
            return $this->error('No autorizado', 403);
        }

        $systemOption->delete();

        return $this->success(null, 'Opción eliminada');
    }

    /**
     * Get grouped options for the entire system at once.
     */
    public function grouped(): JsonResponse
    {
        $options = SystemOption::where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get()
            ->groupBy('category');

        return $this->success($options);
    }
}
