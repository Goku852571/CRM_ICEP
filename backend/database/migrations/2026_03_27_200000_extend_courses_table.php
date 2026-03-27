<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->string('cover_image')->nullable()->after('description');
            $table->decimal('price', 10, 2)->default(0)->after('cover_image');
            $table->enum('status', ['draft', 'active', 'inactive', 'finished', 'archived'])->default('draft')->after('price');
            $table->date('start_date')->nullable()->after('status');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->after('area_id');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['description', 'cover_image', 'price', 'status', 'start_date', 'created_by']);
        });
    }
};
