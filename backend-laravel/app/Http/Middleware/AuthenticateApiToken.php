<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    /**
     * Vérifie le jeton Bearer, l'expiration d'inactivité (BNF03) et que le compte est actif (BF01).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $bearer = $request->bearerToken();

        if (!$bearer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès non autorisé : veuillez vous connecter (jeton manquant).',
            ], 401);
        }

        $tokenHash = hash('sha256', $bearer);
        $apiToken = ApiToken::with('user')->where('token_hash', $tokenHash)->first();

        if (!$apiToken) {
            return response()->json([
                'status' => 'error',
                'message' => 'Session invalide ou expirée. Veuillez vous reconnecter.',
            ], 401);
        }

        if ($apiToken->expires_at->isPast()) {
            $apiToken->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Votre session a expiré pour cause d\'inactivité (BNF03). Veuillez vous reconnecter.',
            ], 401);
        }

        $user = $apiToken->user;
        if (!$user || !$user->is_active) {
            $apiToken->delete();
            return response()->json([
                'status' => 'error',
                'message' => 'Votre compte a été désactivé par l\'administrateur (BF01).',
            ], 403);
        }

        // Prolongation de la session après activité (ex: 2 heures d'inactivité max - BNF03)
        $apiToken->update([
            'last_used_at' => now(),
            'expires_at' => now()->addHours(2),
        ]);

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);
        $request->attributes->set('current_api_token', $apiToken);

        return $next($request);
    }
}

