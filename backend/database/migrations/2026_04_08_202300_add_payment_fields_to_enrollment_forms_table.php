<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollment_forms', function (Blueprint $table) {
            // Número de transacción bancaria único
            $table->string('bank_transaction_id')->nullable()->unique()->after('reviewed_at');
            // Ruta de la imagen del comprobante de pago
            $table->string('payment_voucher_path')->nullable()->after('bank_transaction_id');
            // Jefe al que se solicitó la verificación
            $table->foreignId('payment_requested_to')
                ->nullable()
                ->after('payment_voucher_path')
                ->constrained('users')
                ->nullOnDelete();
            // Quién confirmó el pago y cuándo
            $table->foreignId('payment_confirmed_by')
                ->nullable()
                ->after('payment_requested_to')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('payment_confirmed_at')->nullable()->after('payment_confirmed_by');
        });
    }

    public function down(): void
    {
        Schema::table('enrollment_forms', function (Blueprint $table) {
            $table->dropForeign(['payment_requested_to']);
            $table->dropForeign(['payment_confirmed_by']);
            $table->dropColumn([
                'bank_transaction_id',
                'payment_voucher_path',
                'payment_requested_to',
                'payment_confirmed_by',
                'payment_confirmed_at',
            ]);
        });
    }
};
