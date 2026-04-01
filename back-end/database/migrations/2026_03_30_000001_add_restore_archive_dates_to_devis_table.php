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
        if (! Schema::hasColumn('devis', 'restored_at')) {
            Schema::table('devis', function (Blueprint $table) {
                $table->dateTime('restored_at')->nullable()->after('archive');
            });
        }

        if (! Schema::hasColumn('devis', 'archived_at')) {
            Schema::table('devis', function (Blueprint $table) {
                $table->dateTime('archived_at')->nullable()->after('restored_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('devis', 'restored_at') || Schema::hasColumn('devis', 'archived_at')) {
            Schema::table('devis', function (Blueprint $table) {
                if (Schema::hasColumn('devis', 'archived_at')) {
                    $table->dropColumn('archived_at');
                }
                if (Schema::hasColumn('devis', 'restored_at')) {
                    $table->dropColumn('restored_at');
                }
            });
        }
    }
};
