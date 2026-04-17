<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemOption extends Model
{
    protected $fillable = ['category', 'value', 'label', 'is_active', 'sort_order'];
}
