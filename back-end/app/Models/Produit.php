<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Produit extends Model
{
    use HasFactory;

    protected $fillable = [
        'libelle',
        'description',
        'prix_unitaire',
        'tva',
        'unite',
        'user_id', 
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}