<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'nom',
    'email',
    'telephone',
    'adresse',
])]
class Client extends Model
{
    use HasFactory;

    public function devis()
    {
        return $this->hasMany(Devis::class);
    }
}