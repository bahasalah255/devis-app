<?php

namespace App\Http\Controllers;

use App\Models\DevisLigne;
use Illuminate\Http\Request;

class DevisLigneController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'devis_id'      => 'required|exists:devis,id',
            'produit_id'    => 'nullable|exists:produits,id',
            'description'   => 'required|string',
            'quantite'      => 'required|integer|min:1',
            'prix_unitaire' => 'required|numeric|min:0',
            'remise'        => 'nullable|numeric|min:0|max:100',
        ]);

        $remise      = $request->remise ?? 0;
        $total_ligne = $request->quantite * $request->prix_unitaire * (1 - $remise / 100);

        $ligne = DevisLigne::create([
            'devis_id'      => $request->devis_id,
            'produit_id'    => $request->produit_id,
            'description'   => $request->description,
            'quantite'      => $request->quantite,
            'prix_unitaire' => $request->prix_unitaire,
            'remise'        => $remise,
            'total_ligne'   => $total_ligne,
        ]);

        return response()->json($ligne, 201);
    }

    public function update(Request $request, $id)
    {
        $ligne = DevisLigne::findOrFail($id);

        $request->validate([
            'description'   => 'string',
            'quantite'      => 'integer|min:1',
            'prix_unitaire' => 'numeric|min:0',
            'remise'        => 'nullable|numeric|min:0|max:100',
        ]);

        $remise      = $request->remise ?? $ligne->remise;
        $quantite    = $request->quantite ?? $ligne->quantite;
        $prix        = $request->prix_unitaire ?? $ligne->prix_unitaire;
        $total_ligne = $quantite * $prix * (1 - $remise / 100);

        $ligne->update([
            'produit_id'    => $request->produit_id ?? $ligne->produit_id,
            'description'   => $request->description ?? $ligne->description,
            'quantite'      => $quantite,
            'prix_unitaire' => $prix,
            'remise'        => $remise,
            'total_ligne'   => $total_ligne,
        ]);

        return response()->json($ligne);
    }

    public function destroy($id)
    {
        $ligne = DevisLigne::findOrFail($id);
        $ligne->delete();

        return response()->json([
            'message' => 'Ligne supprimée avec succès'
        ]);
    }
}