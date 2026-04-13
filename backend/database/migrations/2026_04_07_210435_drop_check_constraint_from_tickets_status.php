<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For PostgreSQL, changing a column type doesn't always drop the CHECK constraint.
        // We drop it manually if it exists.
        if (config('database.default') === 'pgsql') {
            DB::statement('ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No obvious rollback needed for dropping a check constraint that we replaced with string.
    }
};
