<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DevisLigne extends Model
{
       protected $fillable = [
        'devis_id',
        'produit_id',
        'description',
        'quantite',
        'prix_unitaire',
        'remise',
        'total_ligne',
    ];

    public function produit()
    {
        return $this->belongsTo(Produit::class);
    }
}
