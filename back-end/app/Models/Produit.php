<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Produit extends Model
{
      protected $fillable = [
        'libelle',
        'description',
        'prix_unitaire',
        'tva',
        'unite',
        'actif',
    ];
}
