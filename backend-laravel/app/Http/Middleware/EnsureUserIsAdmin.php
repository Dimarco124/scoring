<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Limite l'accès aux seules fonctions réservées à l'administrateur (BF04, BNF01).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->isAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé : cette fonction est strictement réservée à l\'administrateur (BNF01).',
            ], 403);
        }

        return $next($request);
    }
}

