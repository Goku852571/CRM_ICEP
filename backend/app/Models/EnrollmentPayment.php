<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnrollmentPayment extends Model
{
    use \Illuminate\Database\Eloquent\SoftDeletes;

    protected $fillable = [
        'enrollment_form_id',
        'amount',
        'bank_transaction_id',
        'payment_voucher_path',
        'payment_concept',
        'bank_name',
        'status',
        'payment_requested_to',
        'payment_confirmed_by',
        'payment_confirmed_at',
        'installment_number',
    ];

    protected $casts = [
        'amount' => 'float',
        'payment_confirmed_at' => 'datetime',
        'installment_number' => 'integer',
    ];

    public function enrollment()
    {
        return $this->belongsTo(EnrollmentForm::class, 'enrollment_form_id');
    }

    public function paymentRequestedTo()
    {
        return $this->belongsTo(User::class, 'payment_requested_to');
    }

    public function paymentConfirmedBy()
    {
        return $this->belongsTo(User::class, 'payment_confirmed_by');
    }
}
