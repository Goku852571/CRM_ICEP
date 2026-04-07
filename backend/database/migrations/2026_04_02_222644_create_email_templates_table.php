<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');                      // Nombre interno de la plantilla
            $table->string('subject');                   // Asunto predeterminado
            $table->longText('html_body');               // HTML completo de la plantilla
            $table->json('variables_hint')->nullable(); // Sugerencias de variables {{nombre}}, etc.
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
