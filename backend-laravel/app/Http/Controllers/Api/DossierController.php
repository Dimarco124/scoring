<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dossier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DossierController extends Controller
{
    /**
     * Règles de validation strictes des formulaires (BF06, BF07, BNF08).
     */
    private function rules(bool $isUpdate = false): array
    {
        $req = $isUpdate ? 'sometimes|required' : 'required';

        return [
            'nom_demandeur' => [$req, 'string', 'max:100'],
            'prenom_demandeur' => [$req, 'string', 'max:120'],
            'telephone_demandeur' => ['nullable', 'string', 'max:30'],
            'numero_piece_identite' => ['nullable', 'string', 'max:60'],
            'age' => [$req, 'integer', 'min:18', 'max:100'],
            'sexe' => [$req, Rule::in(['F', 'M'])],
            'ville' => [$req, 'string', 'max:80'],
            'activite' => [$req, 'string', 'max:80'],
            'revenu_mensuel_estime_fcfa' => [$req, 'numeric', 'min:1000', 'max:50000000'],
            'anciennete_mobile_money_mois' => [$req, 'integer', 'min:0', 'max:360'],
            'volume_mm_mensuel_fcfa' => [$req, 'numeric', 'min:0', 'max:100000000'],
            'factures_cie_sodeci_payees_pct' => [$req, 'numeric', 'min:0', 'max:1'],
            'nb_credits_anterieurs' => [$req, 'integer', 'min:0', 'max:50'],
            'montant_demande_fcfa' => [$req, 'numeric', 'min:10000', 'max:50000000'],
            'duree_mois' => [$req, 'integer', 'min:1', 'max:60'],
            'observations_agent' => ['nullable', 'string', 'max:2000'],
        ];
    }

    private function messages(): array
    {
        return [
            'nom_demandeur.required' => 'Le nom du demandeur est obligatoire.',
            'prenom_demandeur.required' => 'Le prénom du demandeur est obligatoire.',
            'age.min' => 'Le demandeur doit être majeur (au moins 18 ans).',
            'age.max' => 'L\'âge saisi est incohérent (maximum 100 ans).',
            'sexe.in' => 'Le sexe doit être "F" ou "M".',
            'ville.required' => 'Veuillez indiquer la ville du demandeur.',
            'activite.required' => 'Veuillez indiquer l\'activité professionnelle du demandeur.',
            'revenu_mensuel_estime_fcfa.min' => 'Le revenu mensuel estimé doit être d\'au moins 1 000 FCFA.',
            'factures_cie_sodeci_payees_pct.min' => 'Le taux de paiement des factures CIE/SODECI doit être compris entre 0 et 1 (ex: 0.80 pour 80%).',
            'factures_cie_sodeci_payees_pct.max' => 'Le taux de paiement des factures CIE/SODECI ne peut pas dépasser 1.0 (100%).',
            'montant_demande_fcfa.min' => 'Le montant demandé doit être d\'au moins 10 000 FCFA.',
            'duree_mois.min' => 'La durée de remboursement doit être d\'au moins 1 mois.',
            'duree_mois.max' => 'La durée de remboursement ne peut pas excéder 60 mois.',
        ];
    }

    /**
     * BF09 : Afficher la liste des dossiers, les rechercher par référence et les filtrer.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Dossier::with(['agent:id,nom_complet,identifiant', 'derniereEvaluation'])
            ->withCount('evaluations');

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('nom_demandeur', 'like', "%{$search}%")
                  ->orWhere('prenom_demandeur', 'like', "%{$search}%")
                  ->orWhere('telephone_demandeur', 'like', "%{$search}%");
            });
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->query('statut'));
        }

        if ($request->filled('ville')) {
            $query->where('ville', $request->query('ville'));
        }

        if ($request->filled('activite')) {
            $query->where('activite', $request->query('activite'));
        }

        if ($request->filled('niveau_risque')) {
            $risque = $request->query('niveau_risque');
            $query->whereHas('derniereEvaluation', function ($q) use ($risque) {
                $q->where('niveau_risque', $risque);
            });
        }

        $dossiers = $query->orderByDesc('created_at')->get();

        return response()->json([
            'status' => 'success',
            'data' => $dossiers,
        ]);
    }

    /**
     * BF06 & BF07 : Créer un dossier de crédit après contrôle des champs obligatoires et des valeurs.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules(false), $this->messages());

        // Génération automatique d'une référence unique (ex: DOS-2026-0001)
        $nextNumber = (Dossier::max('id') ?? 0) + 1;
        $reference = sprintf('DOS-%s-%04d', date('Y'), $nextNumber);
        while (Dossier::where('reference', $reference)->exists()) {
            $nextNumber++;
            $reference = sprintf('DOS-%s-%04d', date('Y'), $nextNumber);
        }

        $dossier = Dossier::create(array_merge($validated, [
            'reference' => $reference,
            'agent_id' => $request->user()->id,
            'statut' => 'en_cours',
        ]));

        $dossier->load(['agent:id,nom_complet,identifiant', 'evaluations']);

        return response()->json([
            'status' => 'success',
            'message' => "Dossier {$dossier->reference} créé avec succès (BF06).",
            'data' => $dossier,
        ], 201);
    }

    /**
     * BF10 : Consulter le détail d'un dossier, sa date de création et ses évaluations associées.
     */
    public function show(int $id): JsonResponse
    {
        $dossier = Dossier::with([
            'agent:id,nom_complet,identifiant,email',
            'evaluations.agent:id,nom_complet,identifiant',
            'derniereEvaluation',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $dossier,
        ]);
    }

    /**
     * BF08 : Modifier les informations d'un dossier qui n'a pas encore été évalué.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $dossier = Dossier::withCount('evaluations')->findOrFail($id);

        if ($dossier->evaluations_count > 0 || $dossier->statut !== 'en_cours') {
            return response()->json([
                'status' => 'error',
                'message' => 'Modification refusée : ce dossier a déjà fait l\'objet d\'une évaluation de scoring (BF08).',
            ], 422);
        }

        $validated = $request->validate($this->rules(true), $this->messages());
        $dossier->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => "Dossier {$dossier->reference} mis à jour avec succès (BF08).",
            'data' => $dossier->fresh(['agent:id,nom_complet,identifiant', 'evaluations']),
        ]);
    }
}

