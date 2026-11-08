<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (Table evaluations - BF11 à BF16, BNF09).
     */
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dossier_id')->constrained('dossiers')->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('users')->restrictOnDelete();

            $table->decimal('probabilite_defaut', 6, 4);
            $table->decimal('probabilite_defaut_pct', 5, 2);
            $table->unsignedInteger('score');
            $table->enum('niveau_risque', ['Faible', 'Moyen', 'Élevé']);
            $table->string('version_modele', 40)->default('v1.0.0');
            $table->json('variables_transmises');
            $table->text('message_analyse');
            $table->unsignedInteger('temps_reponse_ms')->nullable();
            $table->timestamps();

            $table->index(['dossier_id', 'created_at']);
            $table->index('niveau_risque');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluations');
    }
};

