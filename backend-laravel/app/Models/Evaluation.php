<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Evaluation extends Model
{
    protected $fillable = [
        'dossier_id',
        'agent_id',
        'probabilite_defaut',
        'probabilite_defaut_pct',
        'score',
        'niveau_risque',
        'version_modele',
        'variables_transmises',
        'message_analyse',
        'temps_reponse_ms',
    ];

    protected function casts(): array
    {
        return [
            'probabilite_defaut' => 'float',
            'probabilite_defaut_pct' => 'float',
            'score' => 'integer',
            'variables_transmises' => 'array',
            'temps_reponse_ms' => 'integer',
        ];
    }

    public function dossier(): BelongsTo
    {
        return $this->belongsTo(Dossier::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}

