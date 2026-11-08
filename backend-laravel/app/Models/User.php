<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'nom_complet',
        'identifiant',
        'email',
        'telephone',
        'password',
        'role',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function dossiers(): HasMany
    {
        return $this->hasMany(Dossier::class, 'agent_id');
    }

    public function evaluations(): HasMany
    {
        return $this->hasMany(Evaluation::class, 'agent_id');
    }

    public function apiTokens(): HasMany
    {
        return $this->hasMany(ApiToken::class, 'user_id');
    }
}
