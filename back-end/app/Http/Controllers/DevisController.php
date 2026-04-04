<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Devis;
use App\Models\DevisLigne;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class DevisController extends Controller
{
    public function index_archive(Request $request){
        $devis = Devis::with('client', 'lignes.produit')
            ->where('user_id', $request->user()->id)
            ->where('archive', 1)
            ->latest()
            ->get();

        return response()->json($devis);
    }
    public function index(Request $request)
    {
        $devis = Devis::with('client', 'lignes.produit')
            ->where('user_id', $request->user()->id)
            ->where('archive', 0)
            ->latest()
            ->get();

        return response()->json($devis);
    }

    public function store(Request $request)
    {
        $request->validate([
            'client_id'    => 'required|exists:clients,id',
            'email' => 'nullable|email',
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
        $client = Client::find($request->client_id);
        $resolvedEmail = $request->filled('email') ? $request->email : ($client?->email);

        // Créer le devis
        $devis = Devis::create([
            'client_id'     => $request->client_id,
            'email'         => $resolvedEmail,
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

    public function update(Request $request, $id)
    {
        $devis = Devis::where('user_id', $request->user()->id)->findOrFail($id);

        $request->validate([
            'client_id'             => 'required|exists:clients,id',
            'email' => 'nullable|email',
            'date_emission'         => 'required|date',
            'date_validite'         => 'nullable|date',
            'statut'                => 'nullable|in:brouillon,envoye,accepte,refuse',
            'lignes'                => 'required|array|min:1',
            'lignes.*.description'  => 'required|string',
            'lignes.*.quantite'     => 'required|integer|min:1',
            'lignes.*.prix_unitaire'=> 'required|numeric|min:0',
            'lignes.*.remise'       => 'nullable|numeric|min:0|max:100',
        ]);

        // Recalculate totals
        $total_ht = 0;
        foreach ($request->lignes as $ligne) {
            $remise       = $ligne['remise'] ?? 0;
            $total_ht    += $ligne['quantite'] * $ligne['prix_unitaire'] * (1 - $remise / 100);
        }
        $tva       = 20;
        $total_ttc = $total_ht * (1 + $tva / 100);
        $client = Client::find($request->client_id);
        $resolvedEmail = $request->filled('email') ? $request->email : ($client?->email);

        // Update devis fields
        $devis->update([
            'client_id'     => $request->client_id,
            'email'         => $resolvedEmail,
            'date_emission' => $request->date_emission,
            'date_validite' => $request->date_validite,
            'statut'        => $request->statut ?? $devis->statut,
            'total_ht'      => $total_ht,
            'tva'           => $tva,
            'total_ttc'     => $total_ttc,
        ]);

        // Replace all lines
        $devis->lignes()->delete();
        foreach ($request->lignes as $ligne) {
            $remise      = $ligne['remise'] ?? 0;
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

        return response()->json($devis->load('lignes', 'client'));
    }

    public function updateStatut(Request $request, $id)
    {
        $devis = Devis::where('user_id', $request->user()->id)->findOrFail($id);
        $request->validate(['statut' => 'required|in:brouillon,envoye,accepte,refuse']);
        $devis->update(['statut' => $request->statut]);
        return response()->json($devis);
    }
    public function Archive(Request $request,$id)
    {
        $devis = Devis::where('user_id', $request->user()->id)->findOrFail($id);
          //$devis = Devis::findOrFail($id);
          $devis->update(['archive' => 1,'archived_at' => date('Y-m-d H:i:s'),]);
          return response()->json($devis);
    
    }
     public function Unarchive(Request $request,$id)
    {
        $devis = Devis::where('user_id', $request->user()->id)->findOrFail($id);
          //$devis = Devis::findOrFail($id);
          $devis->update(['archive' => 0 , 'restored_at' => date('Y-m-d H:i:s')]);
          return response()->json($devis);
    
    }
    public function generatePdf(Request $request, $id)
    {
        $devis = Devis::with(['client', 'lignes.produit'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.invoice', compact('devis'));
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="devis-' . ($devis->numero ?? $devis->id) . '.pdf"',
        ]);
    }

    public function sendPdfByEmail(Request $request, $id)
    {
        $devis = Devis::with(['client', 'lignes.produit'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($id);

        $validated = $request->validate([
            'email' => 'nullable|email',
        ]);

        $recipient = $validated['email'] ?? $devis->email ?? $devis->client?->email;

        if (! $recipient) {
            return response()->json([
                'message' => 'Aucun email client disponible pour envoyer ce devis.',
            ], 422);
        }

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.invoice', compact('devis'));
        $pdf->setPaper('a4', 'portrait');
        $pdf->setOptions(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);

        Mail::send([], [], function ($message) use ($recipient, $devis, $pdf) {
            $message
                ->to($recipient)
                ->subject('Devis ' . ($devis->numero ?? ('#' . $devis->id)))
                ->text('Veuillez trouver votre devis en pièce jointe.')
                ->attachData(
                    $pdf->output(),
                    'devis-' . ($devis->numero ?? $devis->id) . '.pdf',
                    ['mime' => 'application/pdf']
                );
        });

        return response()->json([
            'message' => 'Le devis a été envoyé par email avec succès.',
            'email' => $recipient,
        ]);
    }
}