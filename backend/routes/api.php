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
    Route::get('/public/system/settings/enrollment', [\App\Http\Controllers\SystemSettingController::class, 'getEnrollmentSetting']);
    Route::get('/leads/template/download', [\App\Http\Controllers\LeadController::class, 'downloadTemplate']);


    // Serve public storage files (workaround for Windows symlink issues)
    Route::get('/storage/{path}', [\App\Http\Controllers\StorageController::class, 'serve'])->where('path', '.*');

    // Rutas Protegidas
    Route::middleware('auth:sanctum')->group(function () {
        
        // Perfil autenticado y Logout
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/me', [AuthController::class, 'updateProfile']);
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

        // CRM Leads
        Route::get('/leads/stats', [\App\Http\Controllers\LeadController::class, 'stats']);
        Route::get('/leads/template/download', [\App\Http\Controllers\LeadController::class, 'downloadTemplate']);
        Route::post('/leads/import', [\App\Http\Controllers\LeadController::class, 'import']);
        Route::apiResource('leads', \App\Http\Controllers\LeadController::class);
        Route::patch('/leads/{lead}/status', [\App\Http\Controllers\LeadController::class, 'updateStatus']);
        Route::post('/leads/{lead}/interactions', [\App\Http\Controllers\LeadController::class, 'addInteraction']);

        // Dashboard de Ventas (Supervisores)
        Route::middleware('role:admin|jefe')->group(function () {
            Route::get('/sales/dashboard', [\App\Http\Controllers\SalesDashboardController::class, 'index']);
            Route::get('/sales/advisor/{id}/stats', [\App\Http\Controllers\SalesDashboardController::class, 'advisorStats']);
            Route::get('/sales/export', [\App\Http\Controllers\SalesDashboardController::class, 'export']);
            Route::post('/sales/opportunities/{id}/approve', [\App\Http\Controllers\SalesDashboardController::class, 'approveOpportunity']);
        });




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

        // Módulo de Correo Masivo
        Route::prefix('email')->group(function () {
            // Configuración
            Route::get('/settings', [\App\Http\Controllers\EmailController::class, 'getSettings']);
            Route::post('/settings', [\App\Http\Controllers\EmailController::class, 'saveSettings']);
            Route::post('/settings/test', [\App\Http\Controllers\EmailController::class, 'testSettings']);

            // Plantillas
            Route::get('/templates', [\App\Http\Controllers\EmailController::class, 'indexTemplates']);
            Route::post('/templates', [\App\Http\Controllers\EmailController::class, 'storeTemplate']);
            Route::get('/templates/{template}', [\App\Http\Controllers\EmailController::class, 'showTemplate']);
            Route::put('/templates/{template}', [\App\Http\Controllers\EmailController::class, 'updateTemplate']);
            Route::delete('/templates/{template}', [\App\Http\Controllers\EmailController::class, 'destroyTemplate']);

            // Campañas
            Route::get('/campaigns', [\App\Http\Controllers\EmailController::class, 'indexCampaigns']);
            Route::post('/campaigns', [\App\Http\Controllers\EmailController::class, 'storeCampaign']);
            Route::get('/campaigns/{campaign}', [\App\Http\Controllers\EmailController::class, 'showCampaign']);
            Route::post('/campaigns/{campaign}/send', [\App\Http\Controllers\EmailController::class, 'sendCampaign']);
            Route::delete('/campaigns/{campaign}', [\App\Http\Controllers\EmailController::class, 'destroyCampaign']);
            Route::post('/preview-recipients', [\App\Http\Controllers\EmailController::class, 'previewRecipients']);
        });

        // Configuración del Sistema
        Route::middleware('role:admin')->group(function () {
            Route::patch('/system/settings/enrollment', [\App\Http\Controllers\SystemSettingController::class, 'updateEnrollmentSetting']);
        });
    });
});
