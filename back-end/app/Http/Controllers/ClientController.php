<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index()
    {
        $clients = Client::latest()->get();
        return response()->json($clients);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nom'         => 'required|string|max:255',
            'email'       => 'nullable|email|unique:clients',
            'telephone'   => 'nullable|string|max:20',
            'adresse'     => 'nullable|string',
        ]);

        $client = Client::create([
            'nom'         => $request->nom,
            'email'       => $request->email,
            'telephone'   => $request->telephone,
            'adresse'     => $request->adresse,
        ]);

        return response()->json($client, 201);
    }

    public function show($id)
    {
        $client = Client::with('devis')->findOrFail($id);
        return response()->json($client);
    }

    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $request->validate([
            'nom'         => 'string|max:255',
            'email'       => 'nullable|email|unique:clients,email,' . $id,
            'telephone'   => 'nullable|string|max:20',
            'adresse'     => 'nullable|string',
        ]);

        $client->update($request->only([
            'nom',
            'email',
            'telephone',
            'adresse',

        ]));

        return response()->json($client);
    }

    public function destroy($id)
    {
        $client = Client::findOrFail($id);
        $client->delete();

        return response()->json([
            'message' => 'Client supprimé avec succès'
        ]);
    }
}
