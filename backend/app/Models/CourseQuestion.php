<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourseQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id', 'user_id', 'question', 'answer',
        'answered_by', 'answered_at', 'status'
    ];

    protected $casts = [
        'answered_at' => 'datetime',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function asker()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function answerer()
    {
        return $this->belongsTo(User::class, 'answered_by');
    }
}
