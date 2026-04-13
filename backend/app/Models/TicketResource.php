<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketResource extends Model
{
    protected $fillable = [
        'ticket_id',
        'ticket_reply_id',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute()
    {
        return url('/api/v1/storage/' . $this->file_path);
    }

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    public function reply()
    {
        return $this->belongsTo(TicketReply::class, 'ticket_reply_id');
    }
}
