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
        if (! Schema::hasColumn('devis', 'email')) {
            Schema::table('devis', function (Blueprint $table) {
                $table->string('email')->nullable()->after('client_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('devis', 'email')) {
            Schema::table('devis', function (Blueprint $table) {
                $table->dropColumn('email');
            });
        }
    }
};
