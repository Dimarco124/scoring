<?php

namespace Database\Seeders;

use App\Models\Dossier;
use App\Models\Evaluation;
use App\Models\User;
use App\Services\PythonScoringService;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Initialise la base de données avec des comptes (Admin, Agent actif, Agent désactivé)
     * et des dossiers de crédit réalistes en Côte d'Ivoire.
     */
    public function run(): void
    {
        // 1. Compte Administrateur (BF01, BF03, BF04)
        $admin = User::create([
            'nom_complet' => 'Administrateur Général UIYA',
            'identifiant' => 'admin',
            'email' => 'admin@uiya-microfinance.ci',
            'telephone' => '+225 07 00 00 00 01',
            'password' => 'Admin@2026',
            'role' => 'admin',
            'is_active' => true,
        ]);

        // 2. Compte Agent de Crédit Actif (BF01, BF06, BF11)
        $agentGrace = User::create([
            'nom_complet' => 'Ouattara Amoin Grâce Emmanuella',
            'identifiant' => 'agent.grace',
            'email' => 'grace.ouattara@uiya-microfinance.ci',
            'telephone' => '+225 07 00 00 00 02',
            'password' => 'Agent@2026',
            'role' => 'agent',
            'is_active' => true,
        ]);

        // 3. Compte Agent Désactivé (pour tester le refus de connexion BF01)
        User::create([
            'nom_complet' => 'Kouassi Yao (Compte Désactivé)',
            'identifiant' => 'agent.inactif',
            'email' => 'inactif@uiya-microfinance.ci',
            'telephone' => '+225 05 00 00 00 03',
            'password' => 'Agent@2026',
            'role' => 'agent',
            'is_active' => false,
        ]);

        // 4. Création de 5 dossiers réalistes issus du contexte ivoirien
        $dossiersData = [
            [
                'reference' => 'DOS-2026-0001',
                'nom_demandeur' => 'Konan',
                'prenom_demandeur' => 'Adjoua Marie',
                'telephone_demandeur' => '+225 07 48 12 33 10',
                'numero_piece_identite' => 'CI-YAM-2024-8891',
                'age' => 36,
                'sexe' => 'F',
                'ville' => 'Yamoussoukro',
                'activite' => 'salarie',
                'revenu_mensuel_estime_fcfa' => 195000,
                'anciennete_mobile_money_mois' => 84,
                'volume_mm_mensuel_fcfa' => 280000,
                'factures_cie_sodeci_payees_pct' => 0.90,
                'nb_credits_anterieurs' => 2,
                'montant_demande_fcfa' => 150000,
                'duree_mois' => 12,
                'observations_agent' => 'Cliente salariée à Yamoussoukro avec d\'excellents états de paiement CIE/SODECI.',
                'evaluer_automatiquement' => true,
            ],
            [
                'reference' => 'DOS-2026-0002',
                'nom_demandeur' => 'Bamba',
                'prenom_demandeur' => 'Moussa',
                'telephone_demandeur' => '+225 05 55 81 90 12',
                'numero_piece_identite' => 'CI-BKE-2023-4410',
                'age' => 26,
                'sexe' => 'M',
                'ville' => 'Bouaké',
                'activite' => 'restauration',
                'revenu_mensuel_estime_fcfa' => 130000,
                'anciennete_mobile_money_mois' => 36,
                'volume_mm_mensuel_fcfa' => 95000,
                'factures_cie_sodeci_payees_pct' => 0.55,
                'nb_credits_anterieurs' => 1,
                'montant_demande_fcfa' => 240000,
                'duree_mois' => 12,
                'observations_agent' => 'Activité de restauration à Bouaké, quelques retards sur les factures CIE/SODECI.',
                'evaluer_automatiquement' => true,
            ],
            [
                'reference' => 'DOS-2026-0003',
                'nom_demandeur' => 'Yéo',
                'prenom_demandeur' => 'Soro Ibrahim',
                'telephone_demandeur' => '+225 01 41 22 67 89',
                'numero_piece_identite' => 'CI-ABJ-2025-1102',
                'age' => 38,
                'sexe' => 'M',
                'ville' => 'Abidjan',
                'activite' => 'agriculture',
                'revenu_mensuel_estime_fcfa' => 78000,
                'anciennete_mobile_money_mois' => 18,
                'volume_mm_mensuel_fcfa' => 65000,
                'factures_cie_sodeci_payees_pct' => 0.48,
                'nb_credits_anterieurs' => 0,
                'montant_demande_fcfa' => 620000,
                'duree_mois' => 12,
                'observations_agent' => 'Montant demandé très élevé par rapport au revenu mensuel déclaré.',
                'evaluer_automatiquement' => true,
            ],
            [
                'reference' => 'DOS-2026-0004',
                'nom_demandeur' => 'Diallo',
                'prenom_demandeur' => 'Fatoumata',
                'telephone_demandeur' => '+225 07 77 19 42 00',
                'numero_piece_identite' => 'CI-MAN-2024-3099',
                'age' => 34,
                'sexe' => 'F',
                'ville' => 'Man',
                'activite' => 'couture',
                'revenu_mensuel_estime_fcfa' => 165000,
                'anciennete_mobile_money_mois' => 62,
                'volume_mm_mensuel_fcfa' => 140000,
                'factures_cie_sodeci_payees_pct' => 0.82,
                'nb_credits_anterieurs' => 1,
                'montant_demande_fcfa' => 280000,
                'duree_mois' => 9,
                'observations_agent' => 'Atelier de couture à Man, en attente de lancement du scoring.',
                'evaluer_automatiquement' => false,
            ],
            [
                'reference' => 'DOS-2026-0005',
                'nom_demandeur' => 'Koffi',
                'prenom_demandeur' => 'Jean-Luc',
                'telephone_demandeur' => '+225 07 09 88 31 54',
                'numero_piece_identite' => 'CI-KOR-2025-7721',
                'age' => 45,
                'sexe' => 'M',
                'ville' => 'Korhogo',
                'activite' => 'transport',
                'revenu_mensuel_estime_fcfa' => 220000,
                'anciennete_mobile_money_mois' => 96,
                'volume_mm_mensuel_fcfa' => 310000,
                'factures_cie_sodeci_payees_pct' => 0.78,
                'nb_credits_anterieurs' => 3,
                'montant_demande_fcfa' => 400000,
                'duree_mois' => 12,
                'observations_agent' => 'Transporteur à Korhogo, dossier en cours de vérification avant scoring.',
                'evaluer_automatiquement' => false,
            ],
        ];

        $scoringService = app(PythonScoringService::class);

        foreach ($dossiersData as $item) {
            $evaluer = $item['evaluer_automatiquement'];
            unset($item['evaluer_automatiquement']);

            $dossier = Dossier::create(array_merge($item, [
                'agent_id' => $agentGrace->id,
                'statut' => 'en_cours',
            ]));

            if ($evaluer) {
                $pred = $scoringService->evaluerDossier($dossier);
                Evaluation::create([
                    'dossier_id' => $dossier->id,
                    'agent_id' => $agentGrace->id,
                    'probabilite_defaut' => $pred['probabilite_defaut'],
                    'probabilite_defaut_pct' => $pred['probabilite_defaut_pct'],
                    'score' => $pred['score'],
                    'niveau_risque' => $pred['niveau_risque'],
                    'version_modele' => $pred['version_modele'],
                    'variables_transmises' => $pred['variables_transmises'],
                    'message_analyse' => $pred['message_analyse'],
                    'temps_reponse_ms' => $pred['temps_reponse_ms'],
                ]);
                $dossier->update(['statut' => 'evalue']);
            }
        }
    }
}
