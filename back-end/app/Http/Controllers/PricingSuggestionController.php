<?php

namespace App\Http\Controllers;

use App\Models\DevisLigne;
use App\Models\Produit;
use Illuminate\Http\Request;

class PricingSuggestionController extends Controller
{
    public function suggest(Request $request)
    {
        $validated = $request->validate([
            'produit_id' => 'nullable|integer|exists:produits,id',
            'designation' => 'nullable|string|max:255',
            'default_price' => 'nullable|numeric|min:0',
            'margin_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        $produitId = $validated['produit_id'] ?? null;
        $designation = trim((string) ($validated['designation'] ?? ''));
        $defaultPrice = isset($validated['default_price']) ? (float) $validated['default_price'] : null;
        $marginPercent = isset($validated['margin_percent'])
            ? (float) $validated['margin_percent']
            : (float) env('PRICE_SUGGEST_MARGIN_PERCENT', 10);

        $historyQuery = DevisLigne::query()
            ->join('devis', 'devis.id', '=', 'devis_lignes.devis_id')
            ->where('devis.user_id', $request->user()->id);

        if ($produitId) {
            $historyQuery->where('devis_lignes.produit_id', $produitId);
        } elseif ($designation !== '') {
            $historyQuery->whereRaw('LOWER(devis_lignes.description) LIKE ?', ['%' . mb_strtolower($designation) . '%']);
        }

        $historyCount = (clone $historyQuery)->count();
        $averagePrice = $historyCount > 0 ? (float) ((clone $historyQuery)->avg('devis_lignes.prix_unitaire')) : null;
        $lastPrice = $historyCount > 0
            ? (float) ((clone $historyQuery)
                ->orderByDesc('devis_lignes.created_at')
                ->value('devis_lignes.prix_unitaire'))
            : null;

        $productPrice = null;
        if ($produitId) {
            $product = Produit::find($produitId);
            $productPrice = isset($product?->prix_unitaire) ? (float) $product->prix_unitaire : null;
        }

        $basePrice = $lastPrice ?? $averagePrice ?? $productPrice ?? $defaultPrice ?? 0.0;
        $suggestedPrice = round($basePrice * (1 + ($marginPercent / 100)), 2);

        return response()->json([
            'suggested_price' => $suggestedPrice,
            'base_price' => round((float) $basePrice, 2),
            'last_price' => isset($lastPrice) ? round($lastPrice, 2) : null,
            'average_price' => isset($averagePrice) ? round($averagePrice, 2) : null,
            'margin_percent' => $marginPercent,
            'history_count' => $historyCount,
        ]);
    }
}
