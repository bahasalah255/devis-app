<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;
#[Fillable([
     'numero',
        'client_id',
        'user_id',
        'statut',
        'date_emission',
        'date_validite',
        'total_ht',
        'tva',
        'total_ttc',
])]
class Devis extends Model
{
   

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lignes()
    {
        return $this->hasMany(DevisLigne::class);
    }

    // Auto-générer le numéro DEV-0001
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($devis) {
            $last = self::latest()->first();
            $numero = $last ? intval(substr($last->numero, 4)) + 1 : 1;
            $devis->numero = 'DEV-' . str_pad($numero, 4, '0', STR_PAD_LEFT);
        });
    }
}
