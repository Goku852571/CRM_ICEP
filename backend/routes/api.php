<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;

Route::prefix('v1')->group(function () {
    // Rutas públicas de Autenticación
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Rutas Públicas de Formularios de Matrícula
    Route::get('/public/enrollments/{uuid}', [\App\Http\Controllers\EnrollmentFormController::class, 'showPublic']);
    Route::post('/public/enrollments/{uuid}/submit', [\App\Http\Controllers\EnrollmentFormController::class, 'submitPublic']);

    // Serve public storage files (workaround for Windows symlink issues)
    Route::get('/storage/{path}', [\App\Http\Controllers\StorageController::class, 'serve'])->where('path', '.*');

    // Rutas Protegidas
    Route::middleware('auth:sanctum')->group(function () {
        
        // Perfil autenticado y Logout
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Usuarios
        Route::apiResource('users', UserController::class)
            ->middleware('permission:users.view_all|users.create|users.edit');
        
        // Roles
        Route::apiResource('roles', RoleController::class)
            ->only(['index', 'show'])
            ->middleware('role:admin');
            
        // Dashboard
        Route::get('/dashboard/stats', [\App\Http\Controllers\DashboardController::class, 'stats']);

        // Notificaciones
        Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [\App\Http\Controllers\NotificationController::class, 'unreadCount']);
        Route::patch('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
        Route::post('/notifications/mark-all-read', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
        
        // Áreas y Cursos Generales
        Route::get('/areas', [\App\Http\Controllers\AreaController::class, 'index']);
        Route::get('/courses', [\App\Http\Controllers\CourseController::class, 'index']);
        
        // Tickets
        Route::apiResource('tickets', \App\Http\Controllers\TicketController::class);
        Route::patch('/tickets/{ticket}/status', [\App\Http\Controllers\TicketController::class, 'updateStatus']);
        Route::patch('/tickets/{ticket}/priority', [\App\Http\Controllers\TicketController::class, 'updatePriority']);

        // Formularios de Matrícula (Admin)
        Route::apiResource('enrollments', \App\Http\Controllers\EnrollmentFormController::class);
        Route::patch('/enrollments/{enrollment}/status', [\App\Http\Controllers\EnrollmentFormController::class, 'updateStatus']);

        // Calendario (Eventos)
        Route::apiResource('events', \App\Http\Controllers\EventController::class);

        // Cursos
        Route::get('/courses/for-enrollment', [\App\Http\Controllers\CourseController::class, 'listForEnrollment']);
        Route::apiResource('courses', \App\Http\Controllers\CourseController::class);
        Route::post('/courses/{course}/attachments', [\App\Http\Controllers\CourseController::class, 'storeAttachment']);
        Route::delete('/courses/{course}/attachments/{attachment}', [\App\Http\Controllers\CourseController::class, 'destroyAttachment']);

        // Preguntas de Cursos
        Route::get('/courses/{course}/questions', [\App\Http\Controllers\CourseQuestionController::class, 'index']);
        Route::post('/courses/{course}/questions', [\App\Http\Controllers\CourseQuestionController::class, 'store']);
        Route::patch('/courses/{course}/questions/{question}/answer', [\App\Http\Controllers\CourseQuestionController::class, 'answer']);
        Route::delete('/courses/{course}/questions/{question}', [\App\Http\Controllers\CourseQuestionController::class, 'destroy']);
    });
});
