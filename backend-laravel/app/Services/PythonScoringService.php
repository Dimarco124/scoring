<?php

namespace App\Services;

use App\Models\Dossier;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use RuntimeException;

class PythonScoringService
{
    /**
     * Transmet au service Python uniquement les 11 variables nécessaires au modèle (BF12)
     * et retourne l'estimation du risque.
     * En cas de panne ou d'indisponibilité de Python, lève une exception explicite
     * sans jamais inventer de prédiction (BF19, BNF06).
     */
    public function evaluerDossier(Dossier $dossier): array
    {
        if (config('services.python_ml.simulate_down', false) || env('PYTHON_ML_SIMULATE_DOWN', false)) {
            throw new RuntimeException(
                'Le service Python de Machine Learning est actuellement indisponible. '
                . 'Aucune prédiction ne peut être produite pour le moment (BF19).'
            );
        }

        // Extraction stricte des 11 variables prévues pour le modèle (BF12)
        $variables = $dossier->toModelVariables();
        $startTime = microtime(true);

        // Mode 1 : Si une URL HTTP Python externe est configurée
        $httpUrl = env('PYTHON_ML_HTTP_URL');
        if (!empty($httpUrl)) {
            try {
                $response = Http::timeout(8)->post(rtrim($httpUrl, '/') . '/predict', $variables);
                if (!$response->successful()) {
                    $err = $response->json('error') ?? $response->json('message') ?? 'Erreur du serveur Python.';
                    throw new RuntimeException("Erreur du service Python : {$err}");
                }
                $data = $response->json('data') ?? $response->json();
                $elapsedMs = (int) round((microtime(true) - $startTime) * 1000);

                return [
                    'probabilite_defaut' => (float) $data['probabilite_defaut'],
                    'probabilite_defaut_pct' => (float) $data['probabilite_defaut_pct'],
                    'score' => (int) $data['score'],
                    'niveau_risque' => (string) $data['niveau_risque'],
                    'version_modele' => (string) ($data['version_modele'] ?? 'v1.0.0'),
                    'message_analyse' => (string) ($data['message_analyse'] ?? $data['message'] ?? ''),
                    'variables_transmises' => $variables,
                    'temps_reponse_ms' => $elapsedMs,
                ];
            } catch (RuntimeException $e) {
                throw $e;
            } catch (\Throwable $e) {
                throw new RuntimeException(
                    'Impossible de joindre le service Python de scoring. Aucune prédiction n\'a été générée (BF19).'
                );
            }
        }

        // Mode 2 (Par défaut) : Exécution directe du modèle .joblib issu du notebook Anaconda
        $modelPath = env('PYTHON_ML_MODEL_PATH', base_path('../model_scoring_microfinance_v1.joblib'));
        $bridgeScript = storage_path('app/predict_bridge.py');
        $defaultPython = file_exists('C:\\Program Files\\Python313\\python.exe')
            ? 'C:\\Program Files\\Python313\\python.exe'
            : 'python';
        $pythonBin = env('PYTHON_BINARY', $defaultPython);

        if (!file_exists($modelPath)) {
            throw new RuntimeException(
                'Le fichier du modèle entraîné (model_scoring_microfinance_v1.joblib) est introuvable. '
                . 'Veuillez exécuter le notebook entrainement_scoring_microfinance.ipynb (BF19).'
            );
        }

        $payloadJson = json_encode($variables, JSON_UNESCAPED_UNICODE);
        $winEnv = [
            'SystemRoot' => getenv('SystemRoot') ?: 'C:\\WINDOWS',
            'WINDIR' => getenv('WINDIR') ?: 'C:\\WINDOWS',
            'USERPROFILE' => getenv('USERPROFILE') ?: 'C:\\Users\\valde',
            'APPDATA' => getenv('APPDATA') ?: 'C:\\Users\\valde\\AppData\\Roaming',
            'LOCALAPPDATA' => getenv('LOCALAPPDATA') ?: 'C:\\Users\\valde\\AppData\\Local',
            'TEMP' => getenv('TEMP') ?: sys_get_temp_dir(),
            'TMP' => getenv('TMP') ?: sys_get_temp_dir(),
            'PATH' => getenv('PATH') ?: 'C:\\Program Files\\Python313;C:\\WINDOWS\\system32;C:\\WINDOWS',
            'PYTHONIOENCODING' => 'utf-8',
        ];

        $result = Process::timeout(20)
            ->env($winEnv)
            ->input($payloadJson)
            ->run([
                $pythonBin,
                $bridgeScript,
                $modelPath,
            ]);

        if (!$result->successful()) {
            $output = trim($result->output() . "\n" . $result->errorOutput());
            $output = mb_convert_encoding($output, 'UTF-8', 'UTF-8, Windows-1252, ISO-8859-1');
            $decoded = json_decode(trim($result->output()), true);
            $errorMsg = $decoded['message'] ?? ('Le moteur Python de Machine Learning n\'a pas pu traiter la demande : ' . $output);
            throw new RuntimeException($errorMsg);
        }

        $decoded = json_decode(trim($result->output()), true);
        if (!is_array($decoded) || ($decoded['status'] ?? '') !== 'success' || !isset($decoded['data'])) {
            throw new RuntimeException(
                $decoded['message'] ?? 'Réponse invalide du moteur Python de Machine Learning (BF19).'
            );
        }

        $data = $decoded['data'];
        $elapsedMs = (int) round((microtime(true) - $startTime) * 1000);

        return [
            'probabilite_defaut' => (float) $data['probabilite_defaut'],
            'probabilite_defaut_pct' => (float) $data['probabilite_defaut_pct'],
            'score' => (int) $data['score'],
            'niveau_risque' => (string) $data['niveau_risque'],
            'version_modele' => (string) ($data['version_modele'] ?? 'v1.0.0'),
            'message_analyse' => (string) $data['message_analyse'],
            'variables_transmises' => $variables,
            'temps_reponse_ms' => $elapsedMs,
        ];
    }

    /**
     * Retourne les informations et métriques du modèle pour la page Paramètres Admin (BF18, BNF07).
     */
    public function getModelInfo(): array
    {
        $modelPath = env('PYTHON_ML_MODEL_PATH', base_path('../model_scoring_microfinance_v1.joblib'));

        return [
            'model_version' => 'v1.0.0',
            'algorithm' => 'LogisticRegression (Balanced)',
            'notebook_source' => 'entrainement_scoring_microfinance.ipynb',
            'model_file' => basename($modelPath),
            'model_file_available' => file_exists($modelPath),
            'dataset' => [
                'filename' => '19_finance_credit_microfinance.csv',
                'total_rows' => 6000,
                'train_rows' => 4800,
                'test_rows' => 1200,
                'default_rate_pct' => 20.37,
            ],
            'metrics_bnf07' => [
                'accuracy_pct' => 71.25,
                'precision_pct' => 37.47,
                'recall_pct' => 61.89,
                'f1_score_pct' => 46.68,
                'roc_auc_pct' => 74.90,
                'confusion_matrix' => [
                    'true_negatives_vn' => 704,
                    'false_positives_fp' => 252,
                    'false_negatives_fn' => 93,
                    'true_positives_vp' => 151,
                ],
            ],
            'scoring_rules_bf13' => [
                'formule_score' => 'round((1 - probabilite_defaut) * 1000)',
                'echelle' => '0 à 1000',
                'seuils_risque' => [
                    'Faible' => 'Probabilité < 30% (Score > 700)',
                    'Moyen' => '30% <= Probabilité < 60% (400 < Score <= 700)',
                    'Élevé' => 'Probabilité >= 60% (Score <= 400)',
                ],
            ],
            'required_variables_bf12' => Dossier::VARIABLES_MODELE,
            'villes_autorisees' => Dossier::VILLES_AUTORISEES,
            'activites_autorisees' => Dossier::ACTIVITES_AUTORISEES,
        ];
    }
}

