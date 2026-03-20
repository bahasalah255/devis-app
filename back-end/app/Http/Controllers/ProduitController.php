<?php


namespace App\Http\Controllers;

use App\Models\Produit;
use Illuminate\Http\Request;

class ProduitController extends Controller
{
    public function index()
    {
        $produits = Produit->get();
        return response()->json($produits);
    }

    public function store(Request $request)
    {
        $request->validate([
            'libelle'       => 'required|string|max:255',
            'description'   => 'nullable|string',
            'prix_unitaire' => 'required|numeric|min:0',
            'tva'           => 'nullable|numeric|min:0|max:100',
            'unite'         => 'required|in:unite,kg,litre,metre',
        ]);

        $produit = Produit::create([
            'libelle'       => $request->libelle,
            'description'   => $request->description,
            'prix_unitaire' => $request->prix_unitaire,
            'tva'           => $request->tva ?? 20.00,
            'unite'         => $request->unite,
           
        ]);

        return response()->json($produit, 201);
    }

    public function show($id)
    {
        $produit = Produit::findOrFail($id);
        return response()->json($produit);
    }

    public function update(Request $request, $id)
    {
        $produit = Produit::findOrFail($id);

        $request->validate([
            'libelle'       => 'string|max:255',
            'description'   => 'nullable|string',
            'prix_unitaire' => 'numeric|min:0',
            'tva'           => 'nullable|numeric|min:0|max:100',
            'unite'         => 'in:unité,heure,jour,semaine,mois,kg,litre,metre,forfait',
        ]);

        $produit->update($request->only([
            'libelle',
            'description',
            'prix_unitaire',
            'tva',
            'unite',
            'actif',
        ]));

        return response()->json($produit);
    }

    public function destroy($id)
    {
        $produit = Produit::findOrFail($id);

        // Désactiver au lieu de supprimer
        $produit->update(['actif' => false]);

        return response()->json([
            'message' => 'Produit désactivé avec succès'
        ]);
    }
}