<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * BF01 : Authentifier un utilisateur à l'aide de son identifiant (ou email) et de son mot de passe,
     * et refuser l'accès à un compte invalide ou désactivé.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifiant' => ['required', 'string'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ], [
            'identifiant.required' => 'Veuillez saisir votre identifiant ou adresse e-mail.',
            'password.required' => 'Veuillez saisir votre mot de passe.',
        ]);

        $loginInput = trim($validated['identifiant']);

        $user = User::where('identifiant', $loginInput)
            ->orWhere('email', $loginInput)
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Identifiant ou mot de passe incorrect (BF01).',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé : votre compte est désactivé. Contactez l\'administrateur (BF01).',
            ], 403);
        }

        $plainToken = Str::random(64);
        $deviceName = $validated['device_name'] ?? ($request->userAgent() ? substr($request->userAgent(), 0, 95) : 'web');

        ApiToken::create([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $plainToken),
            'device_name' => $deviceName,
            'last_used_at' => now(),
            'expires_at' => now()->addHours(2),
        ]);

        $user->update(['last_login_at' => now()]);

        return response()->json([
            'status' => 'success',
            'message' => 'Connexion réussie.',
            'data' => [
                'token' => $plainToken,
                'token_type' => 'Bearer',
                'expires_in_minutes' => 120,
                'user' => [
                    'id' => $user->id,
                    'nom_complet' => $user->nom_complet,
                    'identifiant' => $user->identifiant,
                    'email' => $user->email,
                    'telephone' => $user->telephone,
                    'role' => $user->role,
                    'is_active' => $user->is_active,
                ],
            ],
        ]);
    }

    /**
     * BF02 : Permettre à l'utilisateur de se déconnecter et fermer sa session.
     */
    public function logout(Request $request): JsonResponse
    {
        /** @var ApiToken|null $apiToken */
        $apiToken = $request->attributes->get('current_api_token');
        if ($apiToken) {
            $apiToken->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Vous avez été déconnecté avec succès (BF02).',
        ]);
    }

    /**
     * BF05 : Consulter les informations de son profil.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'nom_complet' => $user->nom_complet,
                'identifiant' => $user->identifiant,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'last_login_at' => $user->last_login_at,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    /**
     * BF05 : Modifier son mot de passe (BNF02 : hachage Bcrypt).
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6', 'confirmed'],
        ], [
            'current_password.required' => 'Le mot de passe actuel est obligatoire.',
            'new_password.required' => 'Le nouveau mot de passe est obligatoire.',
            'new_password.min' => 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
            'new_password.confirmed' => 'La confirmation du nouveau mot de passe ne correspond pas.',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Le mot de passe actuel saisi est incorrect.',
            ], 422);
        }

        $user->update([
            'password' => $validated['new_password'],
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Votre mot de passe a été modifié avec succès (BF05).',
        ]);
    }
}

