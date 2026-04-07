<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');                      // Nombre de la campaña
            $table->string('subject');                   // Asunto del correo
            $table->longText('html_body');               // HTML final enviado
            $table->foreignId('template_id')->nullable()->constrained('email_templates')->nullOnDelete();
            $table->string('sender_name');
            $table->string('sender_email');
            $table->string('recipient_type');            // 'leads', 'course', 'selected'
            $table->foreignId('recipient_course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->json('recipient_lead_ids')->nullable();
            $table->string('status')->default('draft');  // draft, sending, sent, failed
            $table->timestamp('sent_at')->nullable();
            $table->integer('total_recipients')->default(0);
            $table->integer('sent_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_campaigns');
    }
};
