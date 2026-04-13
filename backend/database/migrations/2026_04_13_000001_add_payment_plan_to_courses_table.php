<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            // Plan de pagos del curso
            $table->decimal('enrollment_value', 12, 2)->default(0)->after('price')
                ->comment('Valor de la matrícula inicial');
            $table->unsignedSmallInteger('installments_count')->default(0)->after('enrollment_value')
                ->comment('Número de cuotas del curso');
            $table->decimal('installment_value', 12, 2)->default(0)->after('installments_count')
                ->comment('Valor de cada cuota');
        });
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn(['enrollment_value', 'installments_count', 'installment_value']);
        });
    }
};
