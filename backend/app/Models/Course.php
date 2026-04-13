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
        'price', 'status', 'start_date', 'created_by',
        'practice_city', 'duration', 'min_price', 'discount', 'schedules',
        'enrollment_value', 'installments_count', 'installment_value',
        'min_installment_value',
    ];

    protected $casts = [
        'start_date'        => 'date',
        'price'             => 'float',
        'min_price'         => 'float',
        'discount'          => 'float',
        'enrollment_value'  => 'float',
        'installments_count'=> 'integer',
        'installment_value' => 'float',
        'min_installment_value' => 'float',
        'practice_city'     => 'array',
        'schedules'         => 'array',
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

    public function catalogItems(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(CourseCatalogItem::class, 'course_catalog_item_pivot', 'course_id', 'catalog_item_id');
    }
}
