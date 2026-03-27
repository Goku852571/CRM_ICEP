<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'description', 'area_id', 'cover_image',
        'price', 'status', 'start_date', 'created_by'
    ];

    protected $casts = [
        'start_date' => 'date',
        'price' => 'float',
    ];

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments()
    {
        return $this->hasMany(CourseAttachment::class);
    }

    public function questions()
    {
        return $this->hasMany(CourseQuestion::class)->latest();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
