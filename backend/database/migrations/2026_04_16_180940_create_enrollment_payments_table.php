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
        Schema::create('enrollment_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_form_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('bank_transaction_id')->unique();
            $table->string('payment_voucher_path')->nullable();
            $table->string('payment_concept', 50)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('status', 50)->default('pending_verification'); // pending_verification, confirmed, rejected
            
            $table->foreignId('payment_requested_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('payment_confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('payment_confirmed_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollment_payments');
    }
};
