<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Dossier extends Model
{
    public const VILLES_AUTORISEES = [
        'Abengourou', 'Abidjan', 'Bouaké', 'Daloa', 'Divo',
        'Gagnoa', 'Korhogo', 'Man', 'San-Pédro', 'Yamoussoukro',
    ];

    public const ACTIVITES_AUTORISEES = [
        'agriculture', 'artisanat', 'commerce', 'couture',
        'restauration', 'salarie', 'transport',
    ];

    public const VARIABLES_MODELE = [
        'age',
        'sexe',
        'ville',
        'activite',
        'revenu_mensuel_estime_fcfa',
        'anciennete_mobile_money_mois',
        'volume_mm_mensuel_fcfa',
        'factures_cie_sodeci_payees_pct',
        'nb_credits_anterieurs',
        'montant_demande_fcfa',
        'duree_mois',
    ];

    protected $fillable = [
        'reference',
        'agent_id',
        'nom_demandeur',
        'prenom_demandeur',
        'telephone_demandeur',
        'numero_piece_identite',
        'age',
        'sexe',
        'ville',
        'activite',
        'revenu_mensuel_estime_fcfa',
        'anciennete_mobile_money_mois',
        'volume_mm_mensuel_fcfa',
        'factures_cie_sodeci_payees_pct',
        'nb_credits_anterieurs',
        'montant_demande_fcfa',
        'duree_mois',
        'statut',
        'observations_agent',
    ];

    protected function casts(): array
    {
        return [
            'age' => 'integer',
            'revenu_mensuel_estime_fcfa' => 'float',
            'anciennete_mobile_money_mois' => 'integer',
            'volume_mm_mensuel_fcfa' => 'float',
            'factures_cie_sodeci_payees_pct' => 'float',
            'nb_credits_anterieurs' => 'integer',
            'montant_demande_fcfa' => 'float',
            'duree_mois' => 'integer',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class)->orderByDesc('created_at');
    }

    public function derniereEvaluation(): HasOne
    {
        return $this->hasOne(Evaluation::class)->latestOfMany();
    }

    /**
     * Retourne uniquement les 11 variables nécessaires au modèle Python (BF12).
     */
    public function toModelVariables(): array
    {
        return [
            'age' => (int) $this->age,
            'sexe' => (string) $this->sexe,
            'ville' => (string) $this->ville,
            'activite' => (string) $this->activite,
            'revenu_mensuel_estime_fcfa' => (float) $this->revenu_mensuel_estime_fcfa,
            'anciennete_mobile_money_mois' => (int) $this->anciennete_mobile_money_mois,
            'volume_mm_mensuel_fcfa' => (float) $this->volume_mm_mensuel_fcfa,
            'factures_cie_sodeci_payees_pct' => (float) $this->factures_cie_sodeci_payees_pct,
            'nb_credits_anterieurs' => (int) $this->nb_credits_anterieurs,
            'montant_demande_fcfa' => (float) $this->montant_demande_fcfa,
            'duree_mois' => (int) $this->duree_mois,
        ];
    }
}

