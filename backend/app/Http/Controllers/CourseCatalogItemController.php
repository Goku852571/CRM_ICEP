<?php

namespace App\Http\Controllers;

use App\Models\CourseCatalogItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class CourseCatalogItemController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = CourseCatalogItem::query();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return $this->success($query->latest()->get());
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:endorsement,sponsorship,certificate',
            'image' => 'nullable|image|max:2048',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('courses/catalog', 'public');
        }

        $item = CourseCatalogItem::create([
            'name' => $request->name,
            'type' => $request->type,
            'image' => $imagePath,
            'description' => $request->description,
            'is_active' => $request->boolean('is_active'),
        ]);

        return $this->success($item, 'Elemento del catálogo creado', 201);
    }

    public function show(CourseCatalogItem $courseCatalogItem): JsonResponse
    {
        return $this->success($courseCatalogItem);
    }

    public function update(Request $request, CourseCatalogItem $courseCatalogItem): JsonResponse
    {
        $request->validate([
            'name' => 'string|max:255',
            'type' => 'in:endorsement,sponsorship,certificate',
            'image' => 'nullable|image|max:2048',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $data = $request->only(['name', 'type', 'description', 'is_active']);

        if ($request->hasFile('image')) {
            if ($courseCatalogItem->image) {
                Storage::disk('public')->delete($courseCatalogItem->image);
            }
            $data['image'] = $request->file('image')->store('courses/catalog', 'public');
        }

        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $courseCatalogItem->update($data);

        return $this->success($courseCatalogItem, 'Elemento del catálogo actualizado');
    }

    public function destroy(CourseCatalogItem $courseCatalogItem): JsonResponse
    {
        if ($courseCatalogItem->image) {
            Storage::disk('public')->delete($courseCatalogItem->image);
        }
        $courseCatalogItem->delete();

        return $this->success(null, 'Elemento del catálogo eliminado');
    }
}
