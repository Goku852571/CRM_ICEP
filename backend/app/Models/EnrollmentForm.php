<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EnrollmentForm extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'advisor_id',
        'course_id',
        'student_name',
        'student_email',
        'student_phone',
        'student_id_number',
        'student_city',
        'extra_data',
        'status',
        'sent_at',
        'completed_at',
        'reviewed_at'
    ];

    protected $casts = [
        'extra_data' => 'array',
        'sent_at' => 'datetime',
        'completed_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function advisor()
    {
        return $this->belongsTo(User::class, 'advisor_id');
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function histories()
    {
        return $this->hasMany(EnrollmentFormHistory::class);
    }
}
