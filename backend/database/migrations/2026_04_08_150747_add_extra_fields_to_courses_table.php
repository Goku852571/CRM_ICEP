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
        Schema::table('courses', function (Blueprint $table) {
            $table->string('practice_city')->nullable();
            $table->string('duration')->nullable();
            $table->decimal('min_price', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->json('endorsements')->nullable(); // avales
            $table->json('sponsorships')->nullable(); // auspicios
            $table->json('certifications')->nullable(); // certificaciones
            $table->json('schedules')->nullable(); // horarios
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn([
                'practice_city', 
                'duration', 
                'min_price', 
                'discount', 
                'endorsements', 
                'sponsorships', 
                'certifications', 
                'schedules'
            ]);
        });
    }
};
