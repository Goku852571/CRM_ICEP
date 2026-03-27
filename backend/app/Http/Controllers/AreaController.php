<?php

namespace App\Http\Controllers;

use App\Models\Area;
use Illuminate\Http\JsonResponse;

class AreaController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->success(Area::all(), 'Áreas recuperadas');
    }
}
