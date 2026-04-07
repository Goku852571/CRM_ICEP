<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadOpportunity extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $fillable = [
        'lead_id',
        'course_id',
        'estimated_value',
        'probability',
        'estimated_close_date',
        'status',
        'requires_approval',
        'is_approved',
        'approved_by',
        'discount_percentage',
    ];

    protected $casts = [
        'estimated_close_date' => 'date',
        'estimated_value' => 'decimal:2',
        'requires_approval' => 'boolean',
        'is_approved' => 'boolean',
        'discount_percentage' => 'decimal:2',
    ];

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }


    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}
