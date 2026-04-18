<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
     // ═══════════════════════════════
    // REGISTER
    // ═══════════════════════════════
    public function register(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|unique:users',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inscription réussie',
            'user'    => $user,
            'token'   => $token,
        ], 201);
    }

    // ═══════════════════════════════
    // LOGIN
    // ═══════════════════════════════
    public function login(Request $request)
{
    $request->validate([
        'email'    => 'required|email',
        'password' => 'required',
    ]);

    if (!Auth::attempt($request->only('email', 'password'))) {
        throw ValidationException::withMessages([
            'email' => ['Email ou mot de passe incorrect.'],
        ]);
    }

    $user = Auth::user();

    
    if (!$user->trial_ends_at) {
        $user->trial_ends_at = now()->addDays(7);
        $user->save();
    }

    // إلا سالات trial -> ما نعطيوش token
    if (now()->greaterThan($user->trial_ends_at)) {
        return response()->json([
            'message' => 'Votre période d’essai est terminée'
        ], 403);
    }

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Connexion réussie',
        'user'    => $user,
        'token'   => $token,
    ]);
}
    // ═══════════════════════════════
    // LOGOUT
    // ═══════════════════════════════
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie',
        ]);
    }

    // ═══════════════════════════════
    // ME (profil connecté)
    // ═══════════════════════════════
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
