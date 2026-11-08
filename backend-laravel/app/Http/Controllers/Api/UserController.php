<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * BF03 / BF04 : Lister les comptes utilisateurs (réservé à l'administrateur).
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->withCount(['dossiers', 'evaluations']);

        if ($request->filled('role')) {
            $query->where('role', $request->query('role'));
        }

        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('nom_complet', 'like', "%{$search}%")
                  ->orWhere('identifiant', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderByDesc('created_at')->get();

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    /**
     * BF03 / BF04 : Créer un compte utilisateur et lui attribuer un rôle (admin ou agent).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom_complet' => ['required', 'string', 'max:150'],
            'identifiant' => ['required', 'string', 'max:80', 'unique:users,identifiant'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(['admin', 'agent'])],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'identifiant.unique' => 'Cet identifiant est déjà utilisé par un autre compte.',
            'email.unique' => 'Cette adresse e-mail est déjà utilisée par un autre compte.',
            'role.in' => 'Le rôle doit être "admin" ou "agent".',
        ]);

        $user = User::create([
            'nom_complet' => $validated['nom_complet'],
            'identifiant' => $validated['identifiant'],
            'email' => $validated['email'],
            'telephone' => $validated['telephone'] ?? null,
            'password' => $validated['password'],
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Compte utilisateur créé avec succès (BF03).',
            'data' => $user,
        ], 201);
    }

    /**
     * BF03 / BF04 : Modifier les informations ou le rôle d'un utilisateur.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'nom_complet' => ['sometimes', 'required', 'string', 'max:150'],
            'identifiant' => ['sometimes', 'required', 'string', 'max:80', Rule::unique('users', 'identifiant')->ignore($user->id)],
            'email' => ['sometimes', 'required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'telephone' => ['nullable', 'string', 'max:30'],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['sometimes', 'required', Rule::in(['admin', 'agent'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        if (isset($validated['is_active']) && !$validated['is_active']) {
            $user->apiTokens()->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Informations du compte mises à jour avec succès (BF03).',
            'data' => $user->fresh(),
        ]);
    }

    /**
     * BF03 : Activer ou désactiver un compte d'agent de crédit.
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vous ne pouvez pas désactiver votre propre compte administrateur.',
            ], 422);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        if (!$user->is_active) {
            // Révoque toutes les sessions actives du compte désactivé (BF01)
            $user->apiTokens()->delete();
        }

        $etat = $user->is_active ? 'activé' : 'désactivé';

        return response()->json([
            'status' => 'success',
            'message' => "Le compte de {$user->nom_complet} a été {$etat} (BF03).",
            'data' => $user,
        ]);
    }

    /**
     * BF03 / BF04 : Supprimer définitivement un compte utilisateur (réservé à l'administrateur).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Vous ne pouvez pas supprimer votre propre compte administrateur.',
            ], 422);
        }

        $nom = $user->nom_complet;

        // Réassigner les dossiers et évaluations éventuels à l'administrateur courant pour préserver l'historique et l'audit bancaire
        $user->dossiers()->update(['agent_id' => $request->user()->id]);
        $user->evaluations()->update(['agent_id' => $request->user()->id]);

        // Révoquer les jetons de connexion
        $user->apiTokens()->delete();

        // Supprimer le compte
        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Le compte de {$nom} a été supprimé avec succès.",
        ]);
    }
}

