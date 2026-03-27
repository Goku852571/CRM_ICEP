<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('enrollment_forms', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('advisor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            
            $table->string('student_name')->nullable();
            $table->string('student_email')->nullable();
            $table->string('student_phone')->nullable();
            $table->string('student_id_number')->nullable();
            $table->string('student_city')->nullable();
            
            $table->json('extra_data')->nullable(); // JSON - campos adicionales
            
            // pending_send|sent|completed|in_review|approved|incomplete|void
            $table->string('status')->default('pending_send'); 
            
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollment_forms');
    }
};
