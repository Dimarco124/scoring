<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DossierController;
use App\Http\Controllers\Api\ScoringController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API - Plateforme de Scoring de Crédit Microfinance (UIYA)
|--------------------------------------------------------------------------
*/

// 1. Authentification publique (BF01)
Route::post('/auth/login', [AuthController::class, 'login']);

// 2. Routes protégées nécessitant une connexion active (BF02 à BF20, BNF01, BNF03)
Route::middleware('auth.token')->group(function () {

    // Session & Profil utilisateur (BF02, BF05)
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);

    // Tableau de bord (BF17)
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Gestion des dossiers de crédit (BF06 à BF10)
    Route::get('/dossiers', [DossierController::class, 'index']);
    Route::post('/dossiers', [DossierController::class, 'store']);
    Route::get('/dossiers/{id}', [DossierController::class, 'show'])->whereNumber('id');
    Route::put('/dossiers/{id}', [DossierController::class, 'update'])->whereNumber('id');

    // Lancement du scoring, Historique et Rapport d'évaluation (BF11 à BF16, BF19)
    Route::post('/dossiers/{id}/score', [ScoringController::class, 'lancerScoring'])->whereNumber('id');
    Route::get('/dossiers/{id}/rapport', [ScoringController::class, 'rapport'])->whereNumber('id');
    Route::get('/evaluations', [ScoringController::class, 'index']);
    Route::get('/evaluations/{id}', [ScoringController::class, 'show'])->whereNumber('id');

    // Informations sur les référentiels (villes, activités) accessibles aux agents pour les formulaires
    Route::get('/referentiels', [DashboardController::class, 'modelSettings']);

    // 3. Routes strictement réservées à l'Administrateur (BF03, BF04, BF18, BNF01)
    Route::middleware('role.admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update'])->whereNumber('id');
        Route::patch('/users/{id}/toggle-active', [UserController::class, 'toggleActive'])->whereNumber('id');
        Route::delete('/users/{id}', [UserController::class, 'destroy'])->whereNumber('id');
        Route::get('/settings/model', [DashboardController::class, 'modelSettings']);
    });
});

