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
        $this->call(AdminUserSeeder::class);

        // ── Known user (use this to login) ────────────────────────
        User::create([
            'name'     => 'Moaad',
            'email'    => 'moaad@mail.com',
            'password' => Hash::make('password'),
        ]);

        
    }
}
