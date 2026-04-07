<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmailTemplate extends Model
{
    protected $fillable = [
        'name',
        'subject',
        'html_body',
        'variables_hint',
        'created_by',
    ];

    protected $casts = [
        'variables_hint' => 'array',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(EmailCampaign::class, 'template_id');
    }
}
