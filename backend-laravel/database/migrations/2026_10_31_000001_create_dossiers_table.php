<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (Table dossiers - BF06 à BF10, BNF08).
     */
    public function up(): void
    {
        Schema::create('dossiers', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 30)->unique();
            $table->foreignId('agent_id')->constrained('users')->restrictOnDelete();

            // Identité du demandeur (BF06)
            $table->string('nom_demandeur', 100);
            $table->string('prenom_demandeur', 120);
            $table->string('telephone_demandeur', 30)->nullable();
            $table->string('numero_piece_identite', 60)->nullable();

            // Les 11 variables du modèle de Machine Learning (BF06, BF12)
            $table->unsignedInteger('age');
            $table->enum('sexe', ['F', 'M']);
            $table->string('ville', 80);
            $table->string('activite', 80);
            $table->decimal('revenu_mensuel_estime_fcfa', 15, 2);
            $table->unsignedInteger('anciennete_mobile_money_mois');
            $table->decimal('volume_mm_mensuel_fcfa', 15, 2);
            $table->decimal('factures_cie_sodeci_payees_pct', 5, 4);
            $table->unsignedInteger('nb_credits_anterieurs')->default(0);
            $table->decimal('montant_demande_fcfa', 15, 2);
            $table->unsignedInteger('duree_mois');

            // Statut et observations (BF08, BF17)
            $table->enum('statut', ['en_cours', 'evalue', 'favorable', 'defavorable'])->default('en_cours');
            $table->text('observations_agent')->nullable();
            $table->timestamps();

            $table->index('statut');
            $table->index(['ville', 'activite']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dossiers');
    }
};

