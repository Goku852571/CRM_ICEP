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
        Schema::table('enrollment_forms', function (Blueprint $table) {
            $table->foreignId('lead_id')->nullable()->after('course_id')->constrained('leads')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollment_forms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lead_id');
        });
    }
};
