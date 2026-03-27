<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

class ApiController extends Controller
{
    /**
     * Return a standardized success JSON response.
     */
    protected function success(mixed $data = [], string $message = 'OK', int $status = 200, array $meta = []): JsonResponse
    {
        $response = [
            'data' => $data,
            'message' => $message,
        ];

        if (!empty($meta)) {
            $response['meta'] = $meta;
        }

        return response()->json($response, $status);
    }

    /**
     * Return a standardized error JSON response.
     */
    protected function error(string $message = 'Error', int $status = 400, array $errors = []): JsonResponse
    {
        $response = [
            'data' => null,
            'message' => $message,
        ];

        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }
}
