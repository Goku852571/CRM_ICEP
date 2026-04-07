<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_settings', function (Blueprint $table) {
            $table->id();
            $table->string('driver')->default('smtp');   // smtp, mailgun, ses
            $table->string('host')->nullable();
            $table->integer('port')->default(587);
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->string('encryption')->default('tls'); // tls, ssl, null
            $table->string('from_address')->nullable();
            $table->string('from_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_settings');
    }
};
