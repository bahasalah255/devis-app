<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Produit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Known user (use this to login) ────────────────────────
        User::create([
            'name'     => 'Moaad',
            'email'    => 'moaad@mail.com',
            'password' => Hash::make('password'),
        ]);

        // ── Clients ───────────────────────────────────────────────
        Client::factory(8)->create();

        // ── Produits (all 10 preset products) ─────────────────────
        Produit::factory(10)->create();
    }
}
