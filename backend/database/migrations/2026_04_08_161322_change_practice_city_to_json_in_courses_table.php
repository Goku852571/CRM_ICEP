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
        // PostgreSQL requires explicit USING clause when converting string to JSON
        \DB::statement('ALTER TABLE courses ALTER COLUMN practice_city TYPE json USING practice_city::json');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('practice_city')->nullable()->change();
        });
    }
};
