<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use \Illuminate\Database\Eloquent\Factories\HasFactory, \Illuminate\Database\Eloquent\SoftDeletes;

    protected $fillable = [
        'uuid',
        'student_id',
        'name',
        'email',
        'phone',
        'city',
        'id_number',
        'profession',
        'country',
        'source',
        'status',
        'course_interest_id',
        'advisor_id',
    ];

    /**
     * Generate automatic IDs on creation.
     */
    protected static function booted()
    {
        static::creating(function ($lead) {
            $lead->uuid = (string) \Illuminate\Support\Str::uuid();
        });
    }

    /**
     * Generate ID: ICEP + [INITIAL_MONTH] + [YY] + [5_ALPHANUM]
     * e.g. ICEPA26X8J2P (For April 2026)
     */
    public static function generateIcepId(): string
    {
        $months = [
            1 => 'E', 2 => 'F', 3 => 'M', 4 => 'A',
            5 => 'M', 6 => 'J', 7 => 'J', 8 => 'A',
            9 => 'S', 10 => 'O', 11 => 'N', 12 => 'D'
        ];

        $monthInitial = $months[(int) date('n')];
        $year = date('y');
        $random = strtoupper(\Illuminate\Support\Str::random(5));

        return "ICEP" . $monthInitial . $year . $random;
    }

    // Relaciones
    public function course()
    {
        return $this->belongsTo(Course::class, 'course_interest_id');
    }

    public function advisor()
    {
        return $this->belongsTo(User::class, 'advisor_id');
    }

    public function interactions()
    {
        return $this->hasMany(LeadInteraction::class)->orderBy('created_at', 'desc');
    }

    public function opportunities()
    {
        return $this->hasMany(LeadOpportunity::class)->orderBy('created_at', 'desc');
    }
}
