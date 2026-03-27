<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnrollmentFormHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrollment_form_id',
        'user_id',
        'action',
        'old_status',
        'new_status',
        'notes'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function enrollmentForm()
    {
        return $this->belongsTo(EnrollmentForm::class);
    }
}
