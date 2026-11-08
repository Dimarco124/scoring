<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dossier;
use App\Models\Evaluation;
use App\Services\PythonScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ScoringController extends Controller
{
    public function __construct(
        private readonly PythonScoringService $scoringService
    ) {}

    /**
     * BF11, BF12, BF13, BF14, BF19 :
     * Lancer l'évaluation du risque d'un dossier valide, transmettre uniquement les
     * 11 variables au service Python, enregistrer l'évaluation avec date & version du modèle,
     * et retourner le score / niveau de risque.
     */
    public function lancerScoring(Request $request, int $dossierId): JsonResponse
    {
        $dossier = Dossier::findOrFail($dossierId);

        // Vérification de cohérence avant le scoring (BF07)
        if ($dossier->age < 18 || $dossier->revenu_mensuel_estime_fcfa <= 0 || $dossier->montant_demande_fcfa <= 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Les données du dossier sont incohérentes. Veuillez les corriger avant de lancer le scoring (BF07).',
            ], 422);
        }

        try {
            $prediction = $this->scoringService->evaluerDossier($dossier);
        } catch (RuntimeException $e) {
            // BF19 & BNF06 : Message clair sans jamais présenter une prédiction inventée
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 503);
        }

        // BF14 & BNF09 : Enregistrer chaque évaluation avec sa date et la version du modèle utilisée
        $evaluation = Evaluation::create([
            'dossier_id' => $dossier->id,
            'agent_id' => $request->user()->id,
            'probabilite_defaut' => $prediction['probabilite_defaut'],
            'probabilite_defaut_pct' => $prediction['probabilite_defaut_pct'],
            'score' => $prediction['score'],
            'niveau_risque' => $prediction['niveau_risque'],
            'version_modele' => $prediction['version_modele'],
            'variables_transmises' => $prediction['variables_transmises'],
            'message_analyse' => $prediction['message_analyse'],
            'temps_reponse_ms' => $prediction['temps_reponse_ms'],
        ]);

        if ($dossier->statut === 'en_cours') {
            $dossier->update(['statut' => 'evalue']);
        }

        $evaluation->load([
            'dossier:id,reference,nom_demandeur,prenom_demandeur,ville,activite,montant_demande_fcfa,duree_mois,statut',
            'agent:id,nom_complet,identifiant',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Évaluation du risque réalisée avec succès (BF11, BF13, BF14).',
            'data' => $evaluation,
        ], 201);
    }

    /**
     * BF15 : Consulter l'historique global des évaluations ou celles d'un dossier précis.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Evaluation::with([
            'dossier:id,reference,nom_demandeur,prenom_demandeur,ville,activite,montant_demande_fcfa,duree_mois',
            'agent:id,nom_complet,identifiant',
        ]);

        if ($request->filled('dossier_id')) {
            $query->where('dossier_id', $request->query('dossier_id'));
        }

        if ($request->filled('niveau_risque')) {
            $query->where('niveau_risque', $request->query('niveau_risque'));
        }

        $evaluations = $query->orderByDesc('created_at')->get();

        return response()->json([
            'status' => 'success',
            'data' => $evaluations,
        ]);
    }

    /**
     * BF15 : Consulter le détail d'une évaluation spécifique.
     */
    public function show(int $id): JsonResponse
    {
        $evaluation = Evaluation::with([
            'dossier.agent:id,nom_complet,identifiant',
            'agent:id,nom_complet,identifiant',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $evaluation,
        ]);
    }

    /**
     * BF16 : Générer les données structurées du rapport d'évaluation d'un dossier
     * (pour affichage, impression ou téléchargement).
     */
    public function rapport(int $dossierId): JsonResponse
    {
        $dossier = Dossier::with([
            'agent:id,nom_complet,identifiant,email',
            'evaluations.agent:id,nom_complet,identifiant',
            'derniereEvaluation.agent:id,nom_complet,identifiant',
        ])->findOrFail($dossierId);

        if (!$dossier->derniereEvaluation) {
            return response()->json([
                'status' => 'error',
                'message' => 'Aucun rapport disponible : ce dossier n\'a pas encore été évalué.',
            ], 404);
        }

        $eval = $dossier->derniereEvaluation;
        $mensualiteTheorique = round($dossier->montant_demande_fcfa / max($dossier->duree_mois, 1), 2);
        $tauxEffortPct = round(($mensualiteTheorique / max($dossier->revenu_mensuel_estime_fcfa, 1)) * 100, 2);

        return response()->json([
            'status' => 'success',
            'data' => [
                'titre_rapport' => "Rapport d'Évaluation de Crédit — {$dossier->reference}",
                'institution' => 'Plateforme de Scoring Microfinance (UIYA)',
                'date_edition' => now()->toIso8601String(),
                'dossier' => $dossier,
                'indicateurs_financiers' => [
                    'mensualite_theorique_fcfa' => $mensualiteTheorique,
                    'taux_effort_mensuel_pct' => $tauxEffortPct,
                    'factures_cie_sodeci_pct' => round($dossier->factures_cie_sodeci_payees_pct * 100, 1),
                ],
                'resultat_scoring' => $eval,
                'avertissement_reglementaire' => $eval->message_analyse,
            ],
        ]);
    }
}

