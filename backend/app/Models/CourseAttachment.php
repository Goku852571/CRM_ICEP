<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id', 'name', 'type', 'path', 'url', 'mime_type', 'size'
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function getDownloadUrlAttribute(): ?string
    {
        if ($this->type === 'file' && $this->path) {
            return url('storage/' . $this->path);
        }
        return $this->url;
    }
}
