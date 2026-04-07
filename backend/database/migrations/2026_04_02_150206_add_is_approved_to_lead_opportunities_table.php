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
        Schema::table('lead_opportunities', function (Blueprint $table) {
            $table->boolean('requires_approval')->default(false);
            $table->boolean('is_approved')->default(true);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('discount_percentage', 5, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('lead_opportunities', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['requires_approval', 'is_approved', 'approved_by', 'discount_percentage']);
        });
    }

};
