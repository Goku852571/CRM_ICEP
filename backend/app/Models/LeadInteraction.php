<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadInteraction extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'lead_id',
        'user_id',
        'type',
        'result',
        'notes',
        'interacted_at',
    ];

    protected $casts = [
        'interacted_at' => 'datetime',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
