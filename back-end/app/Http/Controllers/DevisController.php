<?php

namespace App\Http\Controllers;

use App\Models\Devis;
use App\Models\DevisLigne;
use Illuminate\Http\Request;

class DevisController extends Controller
{
    public function index(Request $request)
    {
        $devis = Devis::with('client', 'lignes')
            ->latest()
            ->get();

        return response()->json($devis);
    }

    public function store(Request $request)
    {
        $request->validate([
            'client_id'    => 'required|exists:clients,id',
            'date_emission'=> 'required|date',
            'date_validite'=> 'nullable|date',
            'lignes'       => 'required|array|min:1',
            'lignes.*.description'  => 'required|string',
            'lignes.*.quantite'     => 'required|integer|min:1',
            'lignes.*.prix_unitaire'=> 'required|numeric|min:0',
            'lignes.*.remise'       => 'nullable|numeric|min:0|max:100',
        ]);

        // Calculer les totaux
        $total_ht = 0;
        foreach ($request->lignes as $ligne) {
            $remise = $ligne['remise'] ?? 0;
            $total_ligne = $ligne['quantite'] * $ligne['prix_unitaire'] * (1 - $remise / 100);
            $total_ht += $total_ligne;
        }

        $tva = 20;
        $total_ttc = $total_ht * (1 + $tva / 100);

        // Créer le devis
        $devis = Devis::create([
            'client_id'     => $request->client_id,
            'user_id'       => $request->user()->id,
            'statut'        => 'brouillon',
            'date_emission' => $request->date_emission,
            'date_validite' => $request->date_validite,
            'total_ht'      => $total_ht,
            'tva'           => $tva,
            'total_ttc'     => $total_ttc,
        ]);

        // Créer les lignes
        foreach ($request->lignes as $ligne) {
            $remise = $ligne['remise'] ?? 0;
            $total_ligne = $ligne['quantite'] * $ligne['prix_unitaire'] * (1 - $remise / 100);
            DevisLigne::create([
                'devis_id'      => $devis->id,
                'produit_id'    => $ligne['produit_id'] ?? null,
                'description'   => $ligne['description'],
                'quantite'      => $ligne['quantite'],
                'prix_unitaire' => $ligne['prix_unitaire'],
                'remise'        => $remise,
                'total_ligne'   => $total_ligne,
            ]);
        }

        return response()->json($devis->load('lignes', 'client'), 201);
    }

    public function show(Request $request, $id)
    {
        $devis = Devis::with('client', 'lignes.produit')
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json($devis);
    }
}