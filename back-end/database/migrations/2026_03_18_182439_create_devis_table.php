<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('devis', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('user_id')->constrained('users');
            $table->enum('statut', ['brouillon', 'envoye', 'accepte', 'refuse']);
            $table->date('date_emission');
            $table->date('date_validite')->nullable();
            $table->decimal('total_ht', 10, 2)->default(0);
            $table->decimal('tva', 5, 2)->default(20.00);
            $table->decimal('total_ttc', 10, 2)->default(0);
            $table->boolean('archive')->default(0)->after('total');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('devis');
    }
};
