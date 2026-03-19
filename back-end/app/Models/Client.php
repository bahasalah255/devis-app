<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
     protected $fillable = [
        'nom',
        'email',
        'telephone',
        'adresse',

    ];

    public function devis()
    {
        return $this->hasMany(Devis::class);
    }
}
