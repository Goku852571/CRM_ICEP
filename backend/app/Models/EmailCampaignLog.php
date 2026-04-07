<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailCampaignLog extends Model
{
    protected $fillable = [
        'campaign_id',
        'recipient_email',
        'recipient_name',
        'status', // sent, failed
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(EmailCampaign::class, 'campaign_id');
    }
}
