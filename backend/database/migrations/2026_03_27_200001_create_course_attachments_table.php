<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // user-readable title
            $table->enum('type', ['file', 'url']);
            $table->string('path')->nullable(); // for uploaded files
            $table->string('url')->nullable();  // for external URLs
            $table->string('mime_type')->nullable();
            $table->bigInteger('size')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_attachments');
    }
};
