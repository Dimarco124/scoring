<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dossier;
use App\Models\Evaluation;
use App\Models\User;
use App\Services\PythonScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(
        private readonly PythonScoringService $scoringService
    ) {}

    /**
     * BF17 : Consulter un tableau de bord présentant le nombre de dossiers,
     * les dossiers en cours, les évaluations réalisées et la répartition des niveaux de risque.
     */
    public function index(Request $request): JsonResponse
    {
        $totalDossiers = Dossier::count();
        $dossiersEnCours = Dossier::where('statut', 'en_cours')->count();
        $dossiersEvalues = Dossier::where('statut', '!=', 'en_cours')->count();
        $totalEvaluations = Evaluation::count();

        // Répartition des niveaux de risque (Faible, Moyen, Élevé)
        $repartitionRisqueRaw = Evaluation::select('niveau_risque', DB::raw('COUNT(*) as total'))
            ->groupBy('niveau_risque')
            ->pluck('total', 'niveau_risque');

        $repartitionRisque = [
            'Faible' => (int) ($repartitionRisqueRaw['Faible'] ?? 0),
            'Moyen' => (int) ($repartitionRisqueRaw['Moyen'] ?? 0),
            'Élevé' => (int) ($repartitionRisqueRaw['Élevé'] ?? 0),
        ];

        $scoreMoyen = round((float) (Evaluation::avg('score') ?? 0), 0);
        $montantTotalDemande = (float) Dossier::sum('montant_demande_fcfa');

        // Répartition des dossiers par activité
        $parActivite = Dossier::select('activite', DB::raw('COUNT(*) as total'))
            ->groupBy('activite')
            ->orderByDesc('total')
            ->get();

        // 5 dernières évaluations réalisées
        $dernieresEvaluations = Evaluation::with([
            'dossier:id,reference,nom_demandeur,prenom_demandeur,ville,activite,montant_demande_fcfa',
            'agent:id,nom_complet,identifiant',
        ])->orderByDesc('created_at')->limit(5)->get();

        $stats = [
            'total_dossiers' => $totalDossiers,
            'dossiers_en_cours' => $dossiersEnCours,
            'dossiers_evalues' => $dossiersEvalues,
            'evaluations_realisees' => $totalEvaluations,
            'score_moyen_sur_1000' => (int) $scoreMoyen,
            'montant_total_demande_fcfa' => $montantTotalDemande,
            'repartition_niveaux_risque' => $repartitionRisque,
            'repartition_par_activite' => $parActivite,
            'dernieres_evaluations' => $dernieresEvaluations,
        ];

        // Statistiques complémentaires sur les comptes si l'utilisateur est Administrateur
        if ($request->user()->isAdmin()) {
            $stats['utilisateurs'] = [
                'total_comptes' => User::count(),
                'agents_actifs' => User::where('role', 'agent')->where('is_active', true)->count(),
                'comptes_desactives' => User::where('is_active', false)->count(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $stats,
        ]);
    }

    /**
     * BF18 : Consulter les paramètres généraux et les informations relatives au modèle.
     */
    public function modelSettings(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->scoringService->getModelInfo(),
        ]);
    }
}

