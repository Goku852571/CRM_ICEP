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
        'lead_id',
        'status',
        'sent_at',
        'completed_at',
        'reviewed_at',
        'bank_transaction_id',
        'payment_voucher_path',
        'payment_requested_to',
        'payment_confirmed_by',
        'payment_confirmed_at',
        // Financial / audit fields
        'sale_value',
        'requires_billing',
        'bank_name',
        'payment_concept',
        'total_paid',
        'balance_due',
    ];

    protected $casts = [
        'extra_data'           => 'array',
        'sent_at'              => 'datetime',
        'completed_at'         => 'datetime',
        'reviewed_at'          => 'datetime',
        'payment_confirmed_at' => 'datetime',
        'requires_billing'     => 'boolean',
        'sale_value'           => 'float',
        'total_paid'           => 'float',
        'balance_due'          => 'float',
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

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function paymentRequestedTo()
    {
        return $this->belongsTo(User::class, 'payment_requested_to');
    }

    public function paymentConfirmedBy()
    {
        return $this->belongsTo(User::class, 'payment_confirmed_by');
    }

    public function payments()
    {
        return $this->hasMany(EnrollmentPayment::class, 'enrollment_form_id');
    }
}
