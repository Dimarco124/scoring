<?php

namespace Tests\Feature;

use App\Models\Dossier;
use App\Models\Evaluation;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoringPlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Section 11 - Test de connexion (BF01, BF02) :
     * Un utilisateur autorisé peut se connecter, un mot de passe invalide est refusé (401),
     * et un compte désactivé est refusé (403).
     */
    public function test_authentification_et_blocage_compte_desactive(): void
    {
        // 1. Connexion valide de l'agent
        $loginRes = $this->postJson('/api/auth/login', [
            'identifiant' => 'agent.grace',
            'password' => 'Agent@2026',
        ]);
        $loginRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.user.role', 'agent');

        // 2. Mot de passe erroné -> 401
        $badRes = $this->postJson('/api/auth/login', [
            'identifiant' => 'agent.grace',
            'password' => 'MauvaisMotDePasse',
        ]);
        $badRes->assertStatus(401);

        // 3. Compte désactivé -> 403 (BF01)
        $inactiveRes = $this->postJson('/api/auth/login', [
            'identifiant' => 'agent.inactif',
            'password' => 'Agent@2026',
        ]);
        $inactiveRes->assertStatus(403);
    }

    /**
     * Section 11 - Test des droits d'accès (BF03, BF04, BNF01) :
     * Un agent ne peut pas utiliser les fonctions réservées à l'administrateur.
     */
    public function test_droits_acces_agent_vs_administrateur(): void
    {
        $agentToken = $this->postJson('/api/auth/login', [
            'identifiant' => 'agent.grace',
            'password' => 'Agent@2026',
        ])->json('data.token');

        // L'agent tente d'accéder à la gestion des utilisateurs -> 403
        $this->withHeader('Authorization', "Bearer {$agentToken}")
            ->getJson('/api/users')
            ->assertStatus(403);

        // L'administrateur accède à la gestion des utilisateurs et crée un nouvel agent -> 201
        $adminToken = $this->postJson('/api/auth/login', [
            'identifiant' => 'admin',
            'password' => 'Admin@2026',
        ])->json('data.token');

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson('/api/users', [
                'nom_complet' => 'Touré Seydou',
                'identifiant' => 'agent.toure',
                'email' => 'seydou.toure@uiya-microfinance.ci',
                'password' => 'Agent@2026',
                'role' => 'agent',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.identifiant', 'agent.toure');
    }

    /**
     * Section 11 - Test des formulaires et du scoring Python (BF06 à BF16) :
     * Contrôle des champs, création de dossier, lancement du scoring avec le modèle .joblib,
     * blocage de la modification après évaluation (BF08) et rapport (BF16).
     */
    public function test_creation_dossier_validation_et_lancement_scoring(): void
    {
        $token = $this->postJson('/api/auth/login', [
            'identifiant' => 'agent.grace',
            'password' => 'Agent@2026',
        ])->json('data.token');

        // 1. Test formulaire invalide (âge mineur et taux CIE/SODECI > 1) -> 422 (BF07)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/dossiers', [
                'nom_demandeur' => 'Kouamé',
                'prenom_demandeur' => 'Aya',
                'age' => 15,
                'sexe' => 'F',
                'ville' => 'Yamoussoukro',
                'activite' => 'commerce',
                'revenu_mensuel_estime_fcfa' => 150000,
                'anciennete_mobile_money_mois' => 24,
                'volume_mm_mensuel_fcfa' => 100000,
                'factures_cie_sodeci_payees_pct' => 1.50,
                'nb_credits_anterieurs' => 0,
                'montant_demande_fcfa' => 200000,
                'duree_mois' => 6,
            ])
            ->assertStatus(422);

        // 2. Création d'un dossier valide -> 201 (BF06)
        $createRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/dossiers', [
                'nom_demandeur' => 'Kouamé',
                'prenom_demandeur' => 'Aya',
                'telephone_demandeur' => '+225 07 11 22 33 44',
                'age' => 33,
                'sexe' => 'F',
                'ville' => 'Yamoussoukro',
                'activite' => 'commerce',
                'revenu_mensuel_estime_fcfa' => 185000,
                'anciennete_mobile_money_mois' => 60,
                'volume_mm_mensuel_fcfa' => 210000,
                'factures_cie_sodeci_payees_pct' => 0.85,
                'nb_credits_anterieurs' => 2,
                'montant_demande_fcfa' => 250000,
                'duree_mois' => 12,
            ]);

        $createRes->assertStatus(201);
        $dossierId = $createRes->json('data.id');

        // 3. Lancement du scoring avec le modèle Python (BF11, BF12, BF13, BF14)
        $scoreRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/dossiers/{$dossierId}/score");

        $scoreRes->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.version_modele', 'v1.0.0');

        $this->assertContains($scoreRes->json('data.niveau_risque'), ['Faible', 'Moyen', 'Élevé']);
        $this->assertGreaterThanOrEqual(0, $scoreRes->json('data.score'));
        $this->assertLessThanOrEqual(1000, $scoreRes->json('data.score'));

        // 4. Un dossier déjà évalué ne peut plus être modifié -> 422 (BF08)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/dossiers/{$dossierId}", [
                'montant_demande_fcfa' => 900000,
            ])
            ->assertStatus(422);

        // 5. Génération du rapport d'évaluation -> 200 (BF16)
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/dossiers/{$dossierId}/rapport")
            ->assertStatus(200)
            ->assertJsonPath('data.resultat_scoring.version_modele', 'v1.0.0');
    }

    /**
     * Section 11 - Test des erreurs (BF19, BNF06) :
     * Un message clair apparaît si le service Python est indisponible,
     * sans jamais enregistrer ni présenter une prédiction inventée.
     */
    public function test_erreur_service_python_indisponible_sans_prediction_inventee(): void
    {
        $token = $this->postJson('/api/auth/login', [
            'identifiant' => 'agent.grace',
            'password' => 'Agent@2026',
        ])->json('data.token');

        $dossierEnCours = Dossier::where('statut', 'en_cours')->firstOrFail();
        $countBefore = Evaluation::count();

        // Simulation d'une panne du service Python
        config(['services.python_ml.simulate_down' => true]);

        $res = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/dossiers/{$dossierEnCours->id}/score");

        $res->assertStatus(503)
            ->assertJsonPath('status', 'error');

        // Vérifie qu'aucune évaluation inventée n'a été enregistrée
        $this->assertSame($countBefore, Evaluation::count());
    }
}

