<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollment_forms', function (Blueprint $table) {
            // Valor total acordado de venta
            $table->decimal('sale_value', 12, 2)->nullable()->after('extra_data')
                ->comment('Valor real acordado de la venta');
            // ¿Requiere facturación?
            $table->boolean('requires_billing')->default(false)->after('sale_value');
            // Banco receptor del pago
            $table->string('bank_name', 100)->nullable()->after('requires_billing');
            // Concepto del pago: 'enrollment' | 'installment_1' | 'installment_2' ...
            $table->string('payment_concept', 50)->nullable()->after('bank_name')
                ->comment('Concepto del pago: enrollment, installment_1, installment_2, etc.');
            // Calculados (desnormalizados para reportes rápidos)
            $table->decimal('total_paid', 12, 2)->default(0)->after('payment_concept')
                ->comment('Suma de pagos validados');
            $table->decimal('balance_due', 12, 2)->nullable()->after('total_paid')
                ->comment('sale_value - total_paid');

            $table->index(['requires_billing'], 'ef_billing_index');
            $table->index(['created_at'], 'ef_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('enrollment_forms', function (Blueprint $table) {
            $table->dropIndex('ef_billing_index');
            $table->dropIndex('ef_created_at_index');
            $table->dropColumn([
                'sale_value',
                'requires_billing',
                'bank_name',
                'payment_concept',
                'total_paid',
                'balance_due',
            ]);
        });
    }
};
