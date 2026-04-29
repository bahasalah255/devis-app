<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    // GET ALL CLIENTS 
    public function index()
    {
        $clients = Client::where('user_id', auth()->id())
            ->latest()
            ->get();

        return response()->json($clients);
    }

    // CREATE CLIENT
    public function store(Request $request)
    {
        $request->validate([
            'nom'       => 'required|string|max:255',
            'email'     => 'nullable|email|unique:clients,email',
            'telephone' => 'nullable|string|max:20',
            'adresse'   => 'nullable|string',
        ]);

        $client = Client::create([
            'nom'       => $request->nom,
            'email'     => $request->email,
            'telephone' => $request->telephone,
            'adresse'   => $request->adresse,
            'user_id'   => auth()->id(), 
        ]);

        return response()->json($client, 201);
    }

    // SHOW CLIENT 
    public function show($id)
    {
        $client = Client::where('user_id', auth()->id())
            ->with('devis')
            ->findOrFail($id);

        return response()->json($client);
    }

    // UPDATE CLIENT 
    public function update(Request $request, $id)
    {
        $client = Client::where('user_id', auth()->id())->findOrFail($id);

        $request->validate([
            'nom'       => 'string|max:255',
            'email'     => 'nullable|email|unique:clients,email,' . $id,
            'telephone' => 'nullable|string|max:20',
            'adresse'   => 'nullable|string',
        ]);

        $client->update($request->only([
            'nom',
            'email',
            'telephone',
            'adresse',
        ]));

        return response()->json($client);
    }

    // DELETE CLIENT 
    public function destroy($id)
    {
        $client = Client::where('user_id', auth()->id())->findOrFail($id);

        $client->delete();

        return response()->json([
            'message' => 'Client supprimé avec succès'
        ]);
    }
}