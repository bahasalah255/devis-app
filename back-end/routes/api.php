<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ProduitController;
use App\Http\Controllers\DevisController;
use App\Http\Controllers\DevisLigneController;
//Routes
Route::post('/login',    [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
	Route::post('/logout', [AuthController::class, 'logout']);
	Route::get('/me', [AuthController::class, 'me']);

	// Devis index_archive
	Route::apiResource('devis', DevisController::class);
   Route::get('/index_archive', [DevisController::class, 'index_archive']);
	Route::patch('devis/{id}/statut', [DevisController::class, 'updateStatut']);
	Route::get('devis/{id}/pdf',      [DevisController::class, 'generatePdf']);
    Route::patch('Archive/{id}' , [DevisController::class, 'Archive']);
	Route::patch('Unarchive/{id}' , [DevisController::class, 'Unarchive']);

	// Lignes de devis
	Route::post('devis-lignes',        [DevisLigneController::class, 'store']);
	Route::put('devis-lignes/{id}',    [DevisLigneController::class, 'update']);
	Route::delete('devis-lignes/{id}', [DevisLigneController::class, 'destroy']);
	

 });
 // Clients
    Route::apiResource('clients', ClientController::class);
	Route::post('clients'  ,[ClientController::class, 'store']);
	Route::get('/devis/{id}/pdf', [DevisController::class, 'downloadPdf']);
	

    // Produits
    Route::apiResource('produits', ProduitController::class);
   
?>