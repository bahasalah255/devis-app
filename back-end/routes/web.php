<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

use App\Http\Controllers\CompanyController;

Route::get('companies/create', [CompanyController::class, 'create'])->name('companies.create');
Route::post('companies', [CompanyController::class, 'store'])->name('companies.store');
