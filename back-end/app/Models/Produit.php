<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'libelle',
    'description',
    'prix_unitaire',
    'tva',
    'unite',
])]
class Produit extends Model
{
    use HasFactory;
}
