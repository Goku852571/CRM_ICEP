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
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('student_id')->unique()->comment('ID autogenerado ICEP'); // e.g. ICEPA26X8J2P
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone');
            $table->string('city')->nullable();
            $table->string('id_number')->nullable();
            $table->string('profession')->nullable();
            $table->string('country')->nullable();
            
            // source could be 'manual', 'enrollment_form', 'pauta', 'organic'
            $table->string('source')->default('manual');
            
            // Status Pipeline
            // new, contacted, interested, following_up, ready_to_close, closed_won, lost
            $table->string('status')->default('new');
            
            $table->foreignId('course_interest_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->foreignId('advisor_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
