<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'name', 'slogan', 'logo', 'address', 'phone', 'fax', 'email',
        'tva_type', 'tva_percent', 'if_number', 'patente', 'rc', 'cnss', 'ice'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

