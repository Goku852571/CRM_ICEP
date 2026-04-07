<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailCampaign extends Model
{
    protected $fillable = [
        'name',
        'subject',
        'html_body',
        'template_id',
        'sender_name',
        'sender_email',
        'recipient_type',   // 'leads', 'course', 'selected'
        'recipient_course_id',
        'recipient_lead_ids',
        'status',           // draft, sending, sent, failed
        'sent_at',
        'total_recipients',
        'sent_count',
        'failed_count',
        'created_by',
    ];

    protected $casts = [
        'recipient_lead_ids' => 'array',
        'sent_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Course::class, 'recipient_course_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(EmailCampaignLog::class, 'campaign_id');
    }
}
