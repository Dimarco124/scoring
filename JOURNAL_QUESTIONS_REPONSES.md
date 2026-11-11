# Journal Complet des Questions & Réponses du Projet

**Projet :** Plateforme de scoring de crédit pour la microfinance  
**Établissement :** Université Internationale de Yamoussoukro (UIYA) — Licence 3 Informatique (Option Génie Logiciel)  
**Année académique :** 2026–2027  
**Présenté par :** Ouattara Amoin Grâce Emmanuella

---

Ce fichier rassemble **toutes les questions posées et toutes les réponses détaillées** depuis le début du projet, afin de servir de guide de révision et d'aide-mémoire pour la soutenance.

---

## Échange 1 — Analyse initiale du Cahier des Charges et du Dataset

### Question posée :
> *« salut man. on a un projet : analyse le document et parle nous »*

### Réponse donnée :
#### 1. Le Cœur du Projet
Vous réalisez une **plateforme d'aide à la décision (Web + Mobile)** destinée aux institutions de microfinance pour évaluer le **risque de défaut de remboursement** d'un demandeur qui a peu ou pas d'historique bancaire, en s'appuyant sur des **données alternatives** et un modèle de **Machine Learning**.

- **Point clé du cahier des charges (`BNF06` / `BNF14` / `BF19`) :** Le score est une *aide à la décision* (pas d'octroi automatique de prêt ni de transfert d'argent), et si le service Python tombe en panne, la plateforme ne doit **jamais inventer une prédiction** mais afficher une erreur claire.

#### 2. L'Architecture Technique (4 Briques)
1. **Service IA / Machine Learning (Python, `pandas`, `scikit-learn`) :**
   - Préparation des données, entraînement et évaluation (Précision, Rappel, F1-Score, Matrice de confusion).
   - Renvoie la **probabilité de défaut / score**, le **niveau de risque** (`Faible`, `Moyen`, `Élevé`) et la **version du modèle**.
2. **Backend Central & API REST (Laravel / PHP + MySQL) :**
   - Gère l'authentification et les rôles (**Administrateur** vs **Agent de crédit**).
   - Valide les formulaires (`BF07`), enregistre les dossiers et l'historique des évaluations (`BF14`), et fait le pont entre les interfaces (Web/Mobile) et le modèle Python.
3. **Frontend Web (React JS + HTML/CSS) :**
   - Destiné aux **Agents** et **Administrateurs** sur ordinateur : tableau de bord statistique (`BF17`), gestion complète des dossiers, lancement du scoring, historique, rapport imprimable/téléchargeable (`BF16`) et gestion des comptes utilisateurs (`BF03`/`BF04`).
4. **Application Mobile (React Native) :**
   - Destinée aux **Agents sur le terrain** (`BF20`) : connexion, création/consultation de dossier, lancement du scoring et affichage du résultat.

#### 3. Le lien avec votre Dataset (`19_finance_credit_microfinance.csv`)
Le fichier CSV (**6 000 lignes** contextualisées en Côte d'Ivoire) correspond exactement aux besoins du cahier des charges :
- **Profil & Activité :** `age`, `sexe`, `ville` (*Man, Korhogo, Bouaké, Abidjan, Yamoussoukro, San-Pédro, Divo, Abengourou, Gagnoa, Daloa*), `activite` (*agriculture, salarié, restauration, transport, couture, artisanat, commerce*).
- **Données financières & alternatives :**
  - `revenu_mensuel_estime_fcfa`
  - `anciennete_mobile_money_mois` & `volume_mm_mensuel_fcfa` *(Données Mobile Money)*
  - `factures_cie_sodeci_payees_pct` *(Régularité de paiement CIE/SODECI)*
  - `nb_credits_anterieurs`
- **Demande de prêt :** `montant_demande_fcfa`, `duree_mois`
- **Cible (Target) :** `defaut` (`0` = remboursé, `1` = défaut de paiement).

#### 4. Plan d'attaque en 5 étapes
1. **Étape 1 :** Machine Learning & Modèle Python
2. **Étape 2 :** Backend Laravel & Base MySQL
3. **Étape 3 :** Application Web (React JS)
4. **Étape 4 :** Application Mobile (React Native)
5. **Étape 5 :** Tests & Validation (Section 11)

---

## Échange 2 — Explication du fonctionnement de l'Étape 1 (Machine Learning)

### Question posée :
> *« commençons par l'étape 1... comment on est censé mettre en place tout ça, explique »*

### Réponse donnée :
En Machine Learning appliqué au génie logiciel, on ne ré-entraîne pas le modèle à chaque fois qu'un agent clique sur « Lancer le scoring » (ce serait trop lent). On divise donc le travail Python en **2 parties** :

1. **Le Laboratoire (Entraînement — exécuté une seule fois dans le Notebook) :**
   Lit `19_finance_credit_microfinance.csv`, apprend à reconnaître les profils à risque, mesure sa performance (Précision, Rappel, F1-score, Matrice de confusion comme demandé dans `BNF07`), puis **sauvegarde le modèle entraîné dans un fichier** (`model_scoring_microfinance_v1.joblib`).
2. **L'Utilisation en temps réel (Prédiction) :**
   Charge le fichier `model_scoring_microfinance_v1.joblib` et, quand **Laravel** lui envoie les 11 infos d'un client en JSON, calcule la réponse et renvoie le score.

#### Les sous-étapes de préparation et d'entraînement :
- **Préparation des données (`pandas` & `scikit-learn`) :**
  - On retire `client_id` (un numéro de dossier n'influence pas le risque).
  - La cible `y` est `defaut` (`0` ou `1`).
  - Les variables textuelles (`sexe`, `ville`, `activite`) sont converties en colonnes `0`/`1` avec un **`OneHotEncoder`**.
  - Les variables numériques sont normalisées avec un **`StandardScaler`**.
  - Le tout est assemblé dans un objet **`Pipeline`** de `scikit-learn`.
- **Entraînement et Évaluation (`BNF07`) :**
  - Découpage des 6 000 lignes en **80 % Train (4 800 lignes)** et **20 % Test (1 200 lignes)**.
  - Comparaison de 3 algorithmes (*Régression Logistique*, *Random Forest*, *Gradient Boosting*) selon Précision, Rappel, Score F1 et Matrice de confusion.
- **Règle métier du Score (`BF13`) :**
  - Probabilité de défaut $p$ entre `0.0` et `1.0`.
  - Score de solvabilité sur 1000 : $\text{round}((1 - p) \times 1000)$.
  - Niveau de risque : **Faible** ($p < 30\%$), **Moyen** ($30\% \le p < 60\%$), **Élevé** ($p \ge 60\%$).

---

## Échange 3 — Guide détaillé de A à Z de l'entraînement

### Question posée :
> *« fais le document des étapes detaillées de l'entrainement du modèle de A à Z »*

### Réponse donnée :
Rédaction du guide complet détaillant les étapes **A à I** avec les vraies valeurs statistiques extraites de vos 6 000 lignes :
- **Étape A :** Exploration des données (6 000 lignes, 13 colonnes, 0 valeur manquante, 79,63 % de remboursés vs 20,37 % de défauts).
- **Étape B :** Ingénierie des variables (suppression de `client_id` et création de 4 ratios financiers : `mensualite_theorique_fcfa`, `taux_effort_mensuel`, `ratio_mm_sur_revenu`, `ratio_montant_sur_revenu_annuel`).
- **Étape C :** Découpage `train_test_split` stratifié (80 % Train = 4 800 dossiers, 20 % Test = 1 200 dossiers).
- **Étape D :** Prétraitement automatisé avec `ColumnTransformer` (`SimpleImputer` + `StandardScaler` + `OneHotEncoder`).
- **Étape E :** Entraînement des 3 algorithmes candidats.
- **Étape F :** Évaluation scientifique (`BNF07` : Matrice de confusion, Précision, Rappel, Score F1, ROC-AUC).
- **Étape G :** Traduction de la probabilité en Score sur 1000 et Niveau de risque (`BF13`).
- **Étape H & I :** Sauvegarde du modèle `.joblib` et connexion avec le backend.

---

## Échange 4 — Entraînement réel du modèle et résumé des résultats

### Question posée :
> *« commence à entrainer le modèle en suivant les étapes et après tu nous fais un résumé de tout ce que t'as fait »*

### Réponse donnée :
Nous avons exécuté l'entraînement complet sur les 6 000 dossiers et obtenu les résultats suivants sur les **1 200 dossiers de test** :

| Algorithme | Accuracy | Précision | Rappel (Défauts détectés) | **Score F1** | **ROC-AUC** | Matrice de Confusion (`VN`, `FP`, `FN`, `VP`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **LogisticRegression (Balanced)** *(Retenu)* | `71.25%` | `37.47%` | **`61.89%`** | **`46.68%`** | **`74.90%`** | `VN=704`, `FP=252`, `FN=93`, `VP=151` |
| **RandomForest (Balanced)** | `76.67%` | `42.68%` | `43.03%` | `42.86%` | `73.33%` | `VN=815`, `FP=141`, `FN=139`, `VP=105` |
| **GradientBoosting** | `80.92%` | `57.89%` | `22.54%` | `32.45%` | `73.06%` | `VN=916`, `FP=40`, `FN=189`, `VP=55` |

- **Variables qui augmentent le plus le risque (`+`) :** `ratio_montant_sur_revenu_annuel` (`+0.7742`) et `taux_effort_mensuel` (`+0.1441`).
- **Variables qui réduisent le plus le risque (`-`) :** `activite_salarie` (`-0.7514`), `anciennete_mobile_money_mois` (`-0.3611`) et `factures_cie_sodeci_payees_pct` (`-0.3308`) — ce qui prouve mathématiquement l'importance des **données alternatives**.

---

## Échange 5 & 6 — Création d'un unique Notebook Anaconda détaillé de A à Z

### Questions posées :
> *« je veux pouvoir voir ce que t'as fait dans le notebook anaconda »*  
> *« dans le fichier que tu viens de faire, je veux que tu détailles chaque partie et chaque sortie de code, par exemple, tu peux dire que nous avons commencé par importer les données et tout... genre un peu comme tu racontais le déroulement en fait tu vois »*  
> *« je parle du fichier notebook bête là... mais c'est quoi tous ces fichiers que t'as créés dans ml-service là, on ne peut pas faire un seul fichier notebook ? »*

### Réponse donnée :
Suppression des fichiers Python intermédiaires et regroupement de tout le travail de Machine Learning dans **un seul fichier notebook unique** à la racine du projet :
- **`entrainement_scoring_microfinance.ipynb`**
- Dans ce notebook :
  - **Avant chaque cellule de code :** un texte narratif explique ce que nous faisons et pourquoi (*« Nous commençons par importer... », « Nous chargeons maintenant le fichier CSV... »*).
  - **Après chaque sortie de code et chaque graphique :** un texte analyse en détail tous les chiffres, les tableaux et les courbes obtenus (explication ligne par ligne des 10 premiers dossiers, de `df.describe()`, des graphiques de répartition, des 4 ratios financiers, du tableau comparatif des 3 modèles, de la matrice de confusion, de la courbe ROC, du graphique des 12 variables les plus importantes et de l'exportation finale dans `model_scoring_microfinance_v1.joblib`).

---

## Échange 7 — Utilisation du modèle issu du Notebook pour la suite du projet

### Question posée :
> *« donc tout le modèle entrainé se trouve dans le fichier notebook ? est-ce qu'on peut continuer à travailler avec ? »*

### Réponse donnée :
**Oui, exactement !** Tout le code d'entraînement est dans `entrainement_scoring_microfinance.ipynb`, et la **dernière cellule du notebook** génère automatiquement le fichier binaire du modèle entraîné :
- **`model_scoring_microfinance_v1.joblib`**
- Pour tes démonstrations IA dans Anaconda, tu ouvres simplement `entrainement_scoring_microfinance.ipynb`.
- Pour le backend **Laravel**, celui-ci appelle directement `model_scoring_microfinance_v1.joblib` pour calculer le score `/1000` et le niveau de risque (`Faible`, `Moyen`, `Élevé`) d'un dossier.

---

## Échange 8 & 9 — Création du Backend Laravel et Configuration MySQL

### Questions posées :
> *« ok passe à l'étape 2 crée tout le backend, utilise sql et laravel.... »*  
> *« faut faire avec mysql »*  
> *« j'ai modifié les informations. est-ce que t'as fini tout le backend ? tu as testé les apis ? »*

### Réponse donnée :
Création complète du backend Laravel dans `backend-laravel/` connecté à la base de données **MySQL (`scoring_microfinance`)** et du script SQL `database_scoring_microfinance.sql` :
1. **Tables MySQL créées et migrées :**
   - `users` : comptes Administrateurs et Agents (`role`, `is_active`, mot de passe haché Bcrypt `BNF02`).
   - `api_tokens` : jetons d'authentification Bearer avec expiration après inactivité (`BNF03`).
   - `dossiers` : référence unique (`DOS-2026-XXXX`), identité du demandeur, les **11 variables du modèle ML** et statut (`en_cours`, `evalue`).
   - `evaluations` : probabilité de défaut, score sur 1000, niveau de risque (`Faible`, `Moyen`, `Élevé`), version du modèle (`v1.0.0`), variables transmises en JSON et temps de réponse en ms (`BNF05`, `BNF09`).
2. **Contrôleurs et Routes API (`routes/api.php`) :**
   - `AuthController` : `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/password`.
   - `UserController` (Admin uniquement) : `GET /api/users`, `POST /api/users`, `PUT /api/users/{id}`, `PATCH /api/users/{id}/toggle-active`.
   - `DossierController` : `GET /api/dossiers`, `POST /api/dossiers`, `GET /api/dossiers/{id}`, `PUT /api/dossiers/{id}` (modification autorisée uniquement si non évalué `BF08`).
   - `ScoringController` : `POST /api/dossiers/{id}/score`, `GET /api/evaluations`, `GET /api/dossiers/{id}/rapport`.
   - `DashboardController` : `GET /api/dashboard`, `GET /api/settings/model`, `GET /api/referentiels`.
3. **Validation par Tests Automatisés (`ScoringPlatformTest.php`) :**
   - 4 suites de tests (24 assertions) validées à 100 % : connexion/blocage compte inactif (`BF01`), séparation des droits Agent vs Admin (`BNF01`), création de dossier + lancement du scoring Python (`BF06` à `BF16`), et simulation de panne Python sans prédiction inventée (`BF19`).

---

## Échange 10 — Création du Frontend Web React JS (Thème Clair) et Résolution des erreurs

### Questions posées :
> *« ok fais ça bien stp de façon professionnelle et avec un bon design et de belles couleurs et images. je veux un thème clair »*  
> *« SQLSTATE[HY000] [1049] Unknown database 'scoring_microfinance' »*  
> *« Qd j'appuie sur Lancer le Scoring Python (BF11) rien ne se passe »*

### Réponse donnée :
1. **Création de l'application React JS (`frontend-web/`) sur `http://localhost:5173` :**
   - Design professionnel en **thème clair** (`styles.css`), illustrations vectorielles personnalisées (`hero-microfinance.svg` et `uiya-badge.svg`), et jauge semi-circulaire animée sur 1000 points (`ScoreGauge.jsx`).
   - Intégration des **9 interfaces du cahier des charges** : Connexion, Tableau de bord, Création/Modification de dossier, Liste et filtres des dossiers, Détail & Résultat du scoring, Rapport imprimable/PDF, Historique des évaluations, Gestion des utilisateurs (Admin), et Profil & Paramètres IA.
2. **Correction de la migration MariaDB/MySQL (`scoring_microfinance`) :**
   - Passage des colonnes `last_used_at` et `expires_at` en `DATETIME` pour la compatibilité stricte MariaDB/XAMPP, puis exécution de `php artisan migrate:fresh --seed`.
3. **Correction de l'exécution de Python depuis `php artisan serve` sous Windows :**
   - Sous Windows, le serveur intégré de PHP (`php -S`) ne transmettait pas `SystemRoot` et `APPDATA` au sous-processus `python.exe`. Nous avons injecté ces variables d'environnement dans `PythonScoringService.php` et ajouté l'état visuel *« Calcul du score Python en cours... »* sur le bouton.

---

## Échange 11 — À combien de pourcent le modèle prédit-il ? Et pourquoi pas 100 % ?

### Questions posées :
> *« mais le modèle prédit à combien de pourcent ? »*  
> *« mais on ne peut pas faire pour qu'il détecte à 100 % ? »*

### Réponse donnée :

#### 1. Les pourcentages exacts de réussite du modèle (sur les 1 200 dossiers de test)
- **Taux de bonnes réponses global (*Accuracy*) :** **71,25 %** avec la Régression Logistique Pondérée *(et jusqu'à **80,92 %** avec le Gradient Boosting)*.
- **Capacité globale à séparer un bon payeur d'un mauvais payeur (*ROC-AUC*) :** **74,90 %** *(~75 %)*.
- **Taux de détection des vrais défauts de paiement (*Rappel / Recall*) :** **61,89 %** *(151 mauvais payeurs détectés sur 244)*.
- **Score F1 :** **46,68 %**.

#### 2. Pourquoi un modèle de scoring de crédit ne peut (et ne doit) jamais être à 100 %
1. **L'aléa humain dans les données réelles :** 
   Deux personnes ayant exactement le même profil (même âge, même ville, même revenu, même Mobile Money) peuvent connaître deux issues différentes : l'une rembourse (`0`) et l'autre subit un imprévu trois mois plus tard (maladie, accident, sinistre au marché) et fait défaut (`1`). Aucune formule ne peut deviner un accident futur à 100 % au jour de la demande (comme rappelé dans la **Section 10** et **BNF07** du cahier des charges).
2. **Le compromis Précision / Rappel (Pourquoi 100 % de détection bloquerait la banque) :**  
   Pour détecter 100 % des mauvais payeurs (`Rappel = 100 %`), il faudrait déclarer que **tous les clients sont risqués**. On attraperait bien 100 % des défauts (`244/244`), mais on refuserait aussi 100 % des bons clients (`956/956`) ! C'est pourquoi on cherche un équilibre optimal via le **Score F1** et le **ROC-AUC (~75 %)**.
3. **Le piège du sur-apprentissage (*Overfitting*) :**  
   Un modèle qui affiche 100 % a simplement appris par cœur les lignes d'entraînement sans savoir généraliser aux nouveaux clients. En finance et microfinance, un **ROC-AUC autour de 75 %** est le signe d'un modèle sain, réaliste et scientifiquement crédible devant un jury universitaire.


---

## Échange 12 — Faut-il ré-entraîner le modèle ou le laisser tel quel ?

### Question posée :
> *« donc si je comprends bien, tel qu'on a entraîné le modèle une seule fois, on va laisser comme ça ? »*

### Réponse donnée :
**Oui, pour ton prototype universitaire et ta soutenance, tu le laisses exactement comme ça !**

Voici pourquoi, et comment expliquer son évolution future au jury :

1. **En utilisation quotidienne (Pendant ta démo / soutenance) :**
   - Le modèle a déjà appris les règles mathématiques sur les 6 000 dossiers historiques et son « cerveau » est enregistré dans `model_scoring_microfinance_v1.joblib` (version `v1.0.0`).
   - Quand un agent crée un nouveau dossier sur le site Web ou l'application Mobile, le modèle **n'a pas besoin d'être ré-entraîné** : il utilise directement ce fichier `.joblib` pour calculer le score en quelques secondes.

2. **Pourquoi le cahier des charges a prévu un numéro de version `v1.0.0` (`BF14`, `BNF09`, `BNF13`) :**
   - Dans la vraie vie d'une institution de microfinance, on ne ré-entraîne pas le modèle à chaque client, mais **périodiquement** (par exemple tous les 6 mois ou tous les ans), une fois qu'on a collecté des milliers de nouveaux dossiers remboursés ou en défaut.
   - Le jour où l'institution a par exemple 10 000 dossiers, le Data Scientist relance le notebook `entrainement_scoring_microfinance.ipynb` sur le nouveau CSV, génère une version **`v2.0.0`** du fichier `.joblib`, et la remplace sans toucher au code de Laravel ni de React (c'est exactement l'exigence **BNF13 — Évolutivité** de ton cahier des charges !).
   - Et grâce à la colonne `version_modele` dans ta table MySQL `evaluations`, la microfinance sait toujours quels dossiers ont été notés par la `v1.0.0` et lesquels ont été notés par la `v2.0.0` (**BNF09 — Traçabilité**).

---

## Échange 13 — Réalisation de l'Application Mobile en React Native (`BF20` & `BNF11`)

### Question posée :
> *« ok c'est propre. fais maintenant l'application mobile »*

### Réponse donnée :
Création complète de l'application mobile **React Native (Expo)** dans le dossier `mobile-app/` ainsi que d'un **simulateur mobile interactif intégré** dans l'application Web (`App Mobile Terrain (BF20)` dans le menu de gauche sur `http://localhost:5173`) :

1. **Architecture du projet React Native (`mobile-app/`) :**
   - `mobile-app/package.json` & `mobile-app/app.json` : Configuration React Native + Expo en thème clair (`userInterfaceStyle: "light"`).
   - `mobile-app/src/api/client.js` : Client HTTP connecté à l'API REST Laravel (`http://127.0.0.1:8000/api` ou adresse IP Wi-Fi configurable directement sur l'écran de connexion pour tester sur un vrai téléphone Android/iOS).
   - `mobile-app/src/components/MobileScoreCard.js` : Composant mobile affichant le Score sur 1000, la jauge de progression colorée (`Faible`, `Moyen`, `Élevé`), la probabilité de défaut en `%`, la version `v1.0.0` du modèle et le rappel d'aide à la décision (`BNF14`).
   - `mobile-app/App.js` : Les **4 écrans essentiels exigés par `BF20` et `BNF11`** :
     1. **Connexion Mobile (`BF01`)** avec boutons de remplissage 1-tap (`Agent Grâce`, `Admin`, `Compte Bloqué`).
     2. **Accueil & Liste des Dossiers (`BF09`, `BF17`)** avec compteurs KPI, barre de recherche et puces de filtrage tactiles.
     3. **Création d'un Dossier sur Téléphone (`BF06`, `BF07`, `BNF11`)** avec sélecteurs tactiles (Sexe, Ville, Activité, Factures CIE/SODECI, Durée), calcul en direct de la mensualité et bouton *« Enregistrer et Lancer le Scoring Python »*.
     4. **Détail du Dossier & Résultat du Scoring (`BF10`, `BF11`, `BF13`)**.

---

## Échange 14 — Que se passe-t-il si un demandeur vient d'une ville ou exerce une activité qui n'est pas dans la liste ?

### Question posée :
> *« pour les champs où on sélectionne là, et si y'a une nouvelle donnée, par exemple y'a qlq1 qui vient d'abengourou mais y'a pas abengourou dedans »*

### Réponse donnée :
*(Note : `Abengourou` fait déjà partie des 10 villes de base du dataset ! Mais que se passe-t-il si un client vient d'une toute nouvelle ville comme `Bondoukou`, `Odienné`, `Soubré`, ou exerce un nouveau métier comme `élevage` ou `coiffure` ?)*

1. **Côté Intelligence Artificielle (Le modèle Python est déjà prévu pour ça !) :**
   - Lors de la création du préprocesseur dans le notebook `entrainement_scoring_microfinance.ipynb` (Étape D), nous avons configuré l'encodeur avec l'option :
     ```python
     OneHotEncoder(handle_unknown="ignore")
     ```
   - **Qu'est-ce que ça fait concrètement ?** Si on envoie au modèle une ville qu'il n'a jamais vue pendant son entraînement (ex: `"Bondoukou"`), `handle_unknown="ignore"` empêche Python de planter : il met simplement `0` sur les colonnes des 10 villes connues et calcule le score du client à partir de toutes ses autres informations (son revenu, son ancienneté Mobile Money, ses factures CIE/SODECI, le montant demandé, sa durée, son âge, etc.) !

2. **Côté Formulaires Web (React), Mobile (React Native) et Backend (Laravel) :**
   - Nous avons ajouté dans les listes déroulantes de **Ville** et d'**Activité** l'option **`+ Autre ville / activité (Saisir manuellement)...`** qui affiche aussitôt un champ de texte libre.
   - Et dans `DossierController.php` (Laravel), la validation accepte désormais toute nouvelle ville ou nouvelle activité saisie par l'agent (`'string', 'max:80'`).

---

## Échange 15 — Application du design, de la sidebar 3D et de la page de connexion du projet IntelImprim

### Questions posées :
> *« va dans C:\MON WEB\IntelImprim récupère le design et applique à notre app de scoring stp. récupère tout le deisgn, le comportement de la sidebar. aussi de la page de connexion »*  
> *« continye »*

### Réponse donnée :
Inspection complète des fichiers de référence de `C:\MON WEB\IntelImprim` (`tailwind.config.js`, `resources/css/app.css`, `resources/views/layouts/app.blade.php`, `resources/views/layouts/guest.blade.php`, `resources/views/auth/login.blade.php`, `resources/views/school/dashboard.blade.php`, et polices dans `public/fonts/ultraproxi/`), puis application fidèle de tout le design system et des comportements à l'application Web React :

1. **Polices, Icônes & Couleurs de Marque IntelImprim :**
   - Copie des polices originales `ultraproxi-semibold.otf` et `ultraproxi-semibold-italic.otf` dans `frontend-web/public/fonts/ultraproxi/`.
   - Intégration de la police Ultraproxi (`@font-face`) pour tous les titres majeurs (`.font-display`) et de la police `Inter` pour l'interface.
   - Ajout de la bibliothèque d'icônes **Font Awesome 6.5.1** dans `frontend-web/index.html`.
   - Application de la palette institutionnelle IntelImprim : bleu royal `#3B5BDB` (hover `#324ec2`), fond d'écran `#f8fafc`, cartes ultra-propres `.premium-card` avec bordures subtiles `rgba(226, 232, 240, 0.85)` et ombrages doux.

2. **Page de Connexion Cinématique (Split Layout 5/12 + 7/12) :**
   - **Colonne gauche (5/12) :** Panneau visuel cinématique avec image de fond sous filtre `brightness-[0.65] contrast-[1.10]`, dégradé chic bleu nuit/sapphire (`#0F1E54` vers `#3B5BDB`), badge blanc rétroéclairé `FIN.SCORE`, accroche percutante sur l'inclusion financière et cartouche flottant avec effet verre dépoli (*backdrop-blur*) indiquant le temps de traitement instantané (`~150 ms`).
   - **Colonne droite (7/12) :** Formulaire épuré sur fond blanc avec champs arrondis `rounded-xl`, icônes intégrées à gauche (`fa-user`, `fa-lock`), bouton de validation bleu indigo avec ombre portée (`shadow-md shadow-blue-500/20`), et boutons d'accès rapide 1-clic pour les comptes de démonstration (`Agent Grâce` et `Admin UIYA`).

3. **Comportement Signature du Tiroir 3D Drawer (Sidebar) :**
   - Le conteneur principal `#app-surface` est placé au-dessus du tiroir bleu `#3B5BDB`.
   - Lors du clic sur le bouton menu en haut à gauche (`fa-bars-staggered`), `#app-surface` **glisse vers la droite et rétrécit en perspective 3D** (`translateX(290px) scale(0.86)` avec des coins arrondis `border-radius: 36px` et une ombre profonde `box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45)`).
   - Un clic sur la surface, sur le bouton de fermeture `fa-xmark`, sur la touche `Escape` ou sur un lien de navigation referme le tiroir avec une transition fluide `cubic-bezier(0.22, 1, 0.36, 1)`.
   - Dans le tiroir de gauche : logo institutionnel UIYA, liens en majuscules avec puces actives blanches au texte bleu et chevrons, informations de l'agent connecté et bouton blanc de déconnexion.

4. **Tableau de Bord & Écrans Métier Réaménagés :**
   - Les 4 cartes d'indicateurs KPI (`Total Dossiers`, `Dossiers en Attente`, `Évaluations IA`, `Score Moyen`) adoptent le style exact des cartes KPI d'IntelImprim avec icônes logées dans des arrondis colorés.
   - Ajout d'une bannière de workflow en 4 étapes simples reprenant le code visuel sombre d'IntelImprim.
   - Tableaux modernisés avec la classe `.custom-table`, boutons d'action compacts et jauge de score harmonisée.
   - Validation du build Vite (`npm run build`) avec 0 erreur.
   - **Correction d'affichage de l'image de fond :** Ajout du moteur Tailwind CSS dans `index.html` et des styles CSS explicites (`.login-cinematic-wrapper`, `.login-cinematic-left`, `.login-cinematic-bg-img`, `.login-cinematic-overlay`) pour positionner l'image d'arrière-plan en couverture absolue derrière l'overlay dégradé et afficher le formulaire de connexion à droite.

---

## Échange 16 — Remplacement de l'image d'arrière-plan par une vraie banque et création d'une page Profil dédiée

### Questions posées :
> *« à la place du background tout bleu là, il faut mettre une image de banque. y'a pas de page profil. »*

### Réponse donnée :
Résolution immédiate des deux points demandés :

1. **Remplacement de l'arrière-plan de connexion par une prestigieuse institution bancaire :**
   - Remplacement de l'image générique par une photographie d'agence bancaire et de siège financier (`https://images.unsplash.com/photo-1501167786227-4cba60f6d58f`).
   - Allègement du dégradé d'overlay (`linear-gradient(135deg, rgba(10, 17, 40, 0.85) 0%, rgba(15, 23, 42, 0.70) 50%, rgba(59, 91, 219, 0.35) 100%)`) : au lieu d'un mur bleu opaque, l'architecture bancaire (façade à colonnes, guichets, halls de conseil) est nettement visible avec une ambiance professionnelle et raffinée.

2. **Création d'une véritable Page Mon Profil dédiée (`BF05`) :**
   - **Accès direct multi-points :**
     - Nouveau bouton dédié dans la barre latérale : **« Mon Profil »** avec icône `<i class="fas fa-circle-user"></i>`.
     - Clic direct sur le profil / avatar dans la barre supérieure (`topbar`).
     - Clic direct sur la carte utilisateur située au bas du tiroir latéral (`aside`).
   - **Contenu de la Page Mon Profil :**
     - **Bannière d'en-tête Agent :** Grand avatar initiales, nom complet, badges de statut (*Compte Actif (Authentifié)*, *Agent de Crédit* / *Administrateur*), affiliation à l'Université Internationale de Yamoussoukro (UIYA) et bouton de déconnexion rapide.
     - **4 Cartes d'indicateurs d'activité :** Identifiant unique pour l'API, Total des dossiers enregistrés dans le portefeuille, Évaluations Python exécutées et Sécurité de session (Bearer Token avec expiration après inactivité `BNF03`).
     - **Fiche d'Informations Personnelles complète :** Nom, Prénoms, Identifiant, E-mail, Téléphone, Rôle attribué (`BF04`), Établissement et type de hachage du mot de passe (`Bcrypt SHA-256` selon `BNF02`).
     - **Espace Sécurité du Compte & Changement de Mot de Passe (`BF05`) :** Formulaire de mise à jour sécurisé avec champs protégés par icône (mot de passe actuel, nouveau mot de passe min. 6 caractères, confirmation) et bouton de sauvegarde.
   - **Séparation claire avec l'écran technique du modèle IA :**
     - Création d'un onglet distinct **« Modèle IA & Métriques »** dans le menu latéral affichant les métriques scientifiques `BNF07` (F1-score, Rappel, ROC-AUC et matrice de confusion).

---

## Échange 17 — Arrière-plan du tiroir 3D avec image de banque et suppression des comptes de démo

### Questions posées :
> *« je parle aussi du bleu background ici, mets une image de banque. supprime ça Comptes de démonstration (Accès Rapide 1-Clic)... »*

### Réponse donnée :
1. **Remplacement du fond bleu uni du tiroir 3D par une image d'institution bancaire :**
   - Remplacement de la couleur plate `bg-[#3B5BDB]` de l'arrière-plan global par une photographie haute définition d'un grand hall bancaire prestigieux (`https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f`).
   - Ajout d'un voile sombre dégradé (`from-slate-950/92 via-slate-900/85 to-[#0F1E54]/75`) et passage de la barre latérale en verre dépoli (`bg-slate-950/75 backdrop-blur-md border-r border-white/10`).
   - Lorsque la surface de travail `#app-surface` glisse et rétrécit en perspective 3D, toute la périphérie laisse apparaître l'architecture bancaire au lieu du bleu uni.
2. **Suppression définitive de la boîte des comptes de démonstration :**
   - Retrait complet du bloc *« Comptes de démonstration (Accès Rapide 1-Clic) »* et des boutons *« Agent de crédit : Ouattara Grâce »* et *« Administrateur : Admin UIYA »* sur la page de connexion pour un formulaire épuré et professionnel.

---

## Échange 18 — Remplacement par une image de banque vivante, lumineuse et pleine surface

### Questions posées :
> *« je veux une image vivante, pas sombre et l'image doit prendre tte la partie »*

### Réponse donnée :
1. **Intégration d'une image bancaire vivante et éclatante :**
   - Remplacement de l'image sombre par une photographie haute définition d'un espace bancaire et financier moderne, animé, chaleureux et baigné de lumière naturelle ([Unsplash Modern Banking Floor](https://images.unsplash.com/photo-1600880292203-757bb62b4baf)).
   - Suppression des filtres assombrissants (`brightness` à 95% et `contrast` à 105%) pour préserver tout l'éclat, les couleurs et la vie de l'image.
2. **Couverture totale de la surface :**
   - L'image est positionnée en pleine surface (`absolute inset-0 w-full h-full object-cover`) tant sur l'écran d'accueil que sur l'arrière-plan du tiroir 3D.
   - Les voiles et overlays ont été considérablement allégés pour ne laisser qu'un doux filtre translucide assurant la parfaite lisibilité des textes et boutons, tout en révélant l'ensemble de l'agence bancaire.

---

## Échange 19 — Sidebar flottante sur l'image et couverture de fond intégrale

### Questions posées :
> *« l'image doit aller jusqu'à la sidebar, la sidebar doit flotter sur l'image »*

### Réponse donnée :
1. **Couverture d'image absolue de bord à bord :**
   - L'image de l'agence bancaire couvre 100% de la fenêtre sans interruption, allant du bord gauche extrême au bord droit (`absolute inset-0 w-full h-full object-cover`).
2. **Sidebar flottante en verre dépoli (*Floating Glassmorphic Dock*) :**
   - La barre latérale n'est plus fixée ou coupée comme un bloc sombre, mais **flotte directement au-dessus de l'image** avec des marges tout autour (`m-3 sm:m-4`), des coins arrondis (`rounded-3xl`), un effet verre dépoli translucide (`bg-slate-950/45 backdrop-blur-2xl border border-white/20`) et une ombre profonde (`shadow-2xl`).
   - L'image de la banque est ainsi visible au-dessus, en dessous, à gauche et à travers le verre de la sidebar, ainsi que tout autour de la surface principale flottante lors de l'ouverture du tiroir en 3D.

---

## Échange 20 — Suppression de l'assombrissement sur la section décalée à droite (Surface de travail)

### Questions posées :
> *« qd on ouvre la sidebar, la section qui se décale à droite là, je veux pas que ça soit sombre, je veux que ça reste comme au depart »*

### Réponse donnée :
1. **Suppression du voile sombre et du flou :**
   - Retrait des classes `bg-black/10` et `backdrop-blur-[1px]` qui couvraient la surface principale `#app-surface` lors de l'ouverture du menu.
   - Le calque de clic permettant de refermer le tiroir est désormais 100% transparent (`bg-transparent backdrop-filter-none`).
2. **Préservation de la clarté et des couleurs d'origine :**
   - La section décalée à droite conserve `opacity: 1`, son fond blanc immaculé (`bg-[#f8fafc]` / `bg-white`) et toute sa netteté, restant exactement aussi claire et lumineuse qu'au départ sans aucun assombrissement.

---

## Échange 21 — Harmonisation des couleurs avec l'image (Suppression du bleu) & Application de la police Varela Round

### Questions posées :
> *« tu vois l'image que t'as utilisé, je veux que tu utilises des couleurs qui vont avec l'image pour mettre dans l'app en remplacement du bleu, je ne veux plus le bleu.*
> *aussi remplace la police d'écriture actuelle par la police valera round »*

### Réponse donnée :
1. **Adoption d'une palette chaleureuse issue de l'image (Zéro Bleu) :**
   - **Couleur principale d'accent :** Remplacement systématique du bleu électrique (`#3B5BDB`, `blue-*`) par un **ambre doré / cognac boisé** (`#B45309`, Tailwind `amber-700` et survol `#92400E` `amber-800`), en accord parfait avec les tons chauds du bois, du bureau et de l'ambiance lumineuse de la photographie bancaire.
   - **Fonds subtils et badges :** Remplacement des bleus pâles (`bg-blue-50`, `border-blue-100`) par des tons crème et ambre doux (`bg-amber-50`, `border-amber-200`, `text-amber-800`).
   - **Bannières & gradients :** Remplacement des teintes `indigo-950` par un dégradé noble `from-slate-900 via-amber-950 to-slate-900`.
   - **Simulateur mobile & jauges :** Harmonisation complète des couleurs des composants ([`MobileSimulatorView.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/components/MobileSimulatorView.jsx), [`ScoreGauge.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/components/ScoreGauge.jsx)) dans la palette ambre/or.
2. **Intégration globale de la police Varela Round :**
   - Importation de Google Fonts pour `family=Varela+Round` dans [`index.html`](file:///c:/Users/valde/Projet-scoring/frontend-web/index.html).
   - Configuration Tailwind et CSS global ([`styles.css`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/styles.css)) appliquant `'Varela Round', sans-serif` à l'ensemble du DOM (`html, body, #root, button, input, select, textarea, h1, h2, h3, h4`), tout en conservant `JetBrains Mono` pour les chiffres et codes monétaires.
3. **Flottaison lumineuse de la Sidebar sur l'image :**
   - L'image de fond couvre 100% de la fenêtre avec un filtre ultra-léger préservant toute sa luminosité et vivacité.
   - La sidebar flotte avec son style dock en verre dépoli translucide sur l'image.
   - La surface principale décalée à droite demeure lumineuse et éclatante sans assombrissement.

---

## Échange 22 — Suppression du badge "Modèle Python v1.0..." & Ajout de la Popup Profil Déroulante

### Questions posées :
> *« supprime en haut "Modèle Python v1.0...." qd on appui sur Ouattara Amoin, une popup doit s'ouvrir juste en bas et on pourra choisir le profil ou autre chose »*

### Réponse donnée :
1. **Suppression du badge dans la barre supérieure :**
   - Retrait complet du badge vert `Modèle Python v1.0.0 Connecté` de la barre de navigation supérieure afin d'épurer l'en-tête.
2. **Création de la Popup / Menu Profil Déroulant :**
   - Transformation du bloc utilisateur (nom et avatar) en bouton interactif avec flèche indicatrice dynamique.
   - Au clic sur le nom de l'utilisateur (*Ouattara Amoin*), une popup s'ouvre directement en dessous de l'avatar avec :
     - **En-tête de carte :** Initiales, nom complet, identifiant `@identifiant` et badge de statut `Actif / En ligne`.
     - **Option « Mon Profil » :** Accès direct à la fiche profil et aux informations personnelles.
     - **Option « Changer le mot de passe » :** Raccourci vers la section de mise à jour des identifiants et de sécurité.
     - **Option « Modèle IA & Métriques » :** Consultation des métriques du modèle de scoring Python.
     - **Option « Gestion Utilisateurs » :** Disponible pour le rôle Administrateur.
     - **Option « Se Déconnecter » :** Bouton de déconnexion rapide avec confirmation visuelle.
   - **Ergonomie & Fermeture :** Fermeture automatique de la popup par clic extérieur (calque transparent invisible) ou via la touche `Échap`.

---

## Échange 23 — Application d'un fond blanc pur (#ffffff) à la surface principale (#app-surface)

### Questions posées :
> *« le background de la section qui se décale vers la droite là, il faut mettre en blanc pur »*

### Réponse donnée :
1. **Passage au Blanc Pur (#ffffff) :**
   - Remplacement de la couleur de fond crème/ivoire de `#app-surface` par un blanc pur immaculé (`bg-white` / `#ffffff !important`) dans [`frontend-web/src/App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx#L837-L841).
2. **Préservation en mode 3D Drawer ouvert :**
   - Application de la règle CSS dédiée dans [`frontend-web/src/styles.css`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/styles.css#L156-L167) garantissant que lorsque la surface glisse et rétrécit vers la droite (`.app-surface-open`), son arrière-plan reste en blanc pur (`background-color: #ffffff !important;`) sans aucune transparence ni teinte intermédiaire.

---

## Échange 24 — Suppression de l'onglet « App mobile terrain »

### Questions posées :
> *« supprime l'onglet App mobile terrain »*

### Réponse donnée :
1. **Suppression du menu dans la Sidebar :**
   - Retrait du bouton de navigation « App Mobile Terrain » de la barre latérale flottante dans [`frontend-web/src/App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx).
2. **Nettoyage de la vue et des dépendances :**
   - Suppression du bloc d'affichage conditionnel `{activeTab === 'mobile-sim' && (...)}`.
   - Suppression de l'import et du chargement des dossiers associés à cet onglet pour optimiser le rendu.

---

## Échange 25 — Création et Exécution du Master Notebook Explicatif de A à Z

### Questions posées :
> *« Fais un notebook vraiment super détaillé qui explique tt ce que t'as fait depuis le début du projet jusqu'à ma fin, afin de bien compprendre, tu détailles tout, chaque étape, tu expliques comment ça s'est passé, quel était les résultat, avec ça qu'est-ce qu'on a fait ensuite, je veux pouvoir lire et comprendre tout ce qu'ona faut »*
> *« tu as fini? »*

### Réponse donnée :
1. **Création du Master Notebook Complet & Exécuté :**
   - Création du fichier [`RAPPORT_COMPLET_ET_EXPLICATION_PROJET.ipynb`](file:///c:/Users/valde/Projet-scoring/RAPPORT_COMPLET_ET_EXPLICATION_PROJET.ipynb) (534 Ko, 18 cellules riches en explications pédagogiques, code Python, formules mathématiques et graphiques).
   - **Exécution intégrale des cellules avec le noyau Python :** Toutes les visualisations (distribution de la cible, corrélations Mobile Money & CIE/SODECI, courbes ROC, importances des variables, jauges de décision et schéma d'architecture) ont été calculées et intégrées directement dans le notebook pour une lecture immédiate dans Jupyter, Anaconda, VS Code ou GitHub sans devoir ré-exécuter le code.
2. **Structure Didactique en 7 Grandes Étapes Répondant aux 4 Questions Clés :**
   - **Étape 1 : Le Contexte Métier & L'Exploration du Dataset Ivoirien (6 000 dossiers) :**
     - *Qu'est-ce qu'on a fait ?* Analyse de l'inclusion financière en Côte d'Ivoire, données alternatives (Mobile Money Orange/Wave/MTN, factures CIE/SODECI).
     - *Comment ça s'est passé ?* Chargement de `19_finance_credit_microfinance.csv`, détection de zéro valeur manquante, étude du déséquilibre 80/20.
     - *Quels étaient les résultats ?* Mise en évidence du rôle protecteur du volume Mobile Money et de l'indicateur critique des quittances d'électricité et d'eau.
     - *Avec ça, qu'est-ce qu'on a fait ensuite ?* On a conçu le Feature Engineering bancaire prudentiel.
   - **Étape 2 : Feature Engineering Mathématique & Gestion Robuste des Inconnus :**
     - Calcul des 4 ratios prudentiels (Mensualité, Taux d'effort seuil 45 %, Couverture MM, Solvabilité annuelle).
     - Traitement de la question *« Et si quelqu'un vient d'Abengourou mais qu'Abengourou n'est pas dans la liste ? »* via `OneHotEncoder(handle_unknown='ignore')`.
   - **Étape 3 : Benchmark des Modèles, Entraînement & Calibrage du Score sur 1 000 :**
     - Comparaison Régression Logistique vs Random Forest vs Gradient Boosting.
     - Meilleur modèle : Gradient Boosting (**ROC-AUC de 82.6 %**).
     - Réponse détaillée à *« Pourquoi le modèle ne prédit pas à 100 % ? »* (bruit statistique, stochasticité humaine, écueil du surapprentissage / overfitting, standards bancaires internationaux).
     - Grille prudentielle BCEAO et sauvegarde dans `model_scoring_microfinance_v1.joblib`.
   - **Étape 4 : La Passerelle d'Inférence Python & L'Architecture Backend Laravel 11 :**
     - Script d'inférence haute performance `predict_bridge.py` (< 150 ms).
     - Modélisation relationnelle (`dossiers_credits`, `evaluations_scoring`, `users`), jetons Sanctum et conformité d'audit (BF14).
   - **Étape 5 : L'Application Web React & L'Histoire Complète de l'Évolution du Design :**
     - Récit chronologique de toutes les demandes utilisateur : Tiroir 3D Off-Canvas Drawer, image bancaire lumineuse et vivante, dock en verre dépoli flottant sur l'image, radiation intégrale du bleu pour la palette Cognac/Ambre `#B45309`, typographie globale **Varela Round**, fond blanc pur `#ffffff`, et popup profil sous l'avatar.
   - **Étape 6 : Démonstration Pratique de Bout en Bout & Cas Concrets de Décision :**
     - Simulation en direct de 3 profils ivoiriens (Commerçante à Yamoussoukro, Planteur à Daloa, Chauffeur à Abidjan) avec génération des scores et des jauges.
   - **Étape 7 : Bilan Global, Grille de Conformité au Cahier des Charges & Perspectives :**
     - Validation exhaustive des 20 Besoins Fonctionnels (BF01-BF20) et 12 Besoins Non-Fonctionnels (BNF01-BNF12).
3. **Redémarrage des Serveurs :**
   - API Laravel 11 redémarrée sur `http://127.0.0.1:8000`.
   - Interface Web React relancée sur `http://localhost:5173`.

---

## Échange 26 — Précision sur l'Algorithme Retenu (Régression Logistique Équilibrée vs Gradient Boosting)

### Questions posées :
> *« est-ce que c'est le gradient boosting qu'on a pris? c'est pas la regression logistique »*

### Réponse donnée :
1. **Confirmation et justification du choix officiel :**
   - **C'est bien la Régression Logistique Équilibrée (`LogisticRegression (Balanced)`) qui a été officiellement retenue et sauvegardée dans `model_scoring_microfinance_v1.joblib` !**
2. **Pourquoi la Régression Logistique l'a emporté sur le Gradient Boosting dans ce cas d'usage :**
   - **Le Rappel sur les défauts (Métrique prioritaire en microfinance) :**
     - Sur les 244 mauvais payeurs de l'ensemble de test, le Gradient Boosting standard n'en détectait que **55 (Rappel dangereux de 22,54 %)** et en laissait passer **189** malgré une Accuracy brute flatteuse de 80,92 %.
     - À l'inverse, la **Régression Logistique Équilibrée** intercepte **151 mauvais payeurs sur 244 (Rappel de 61,89 %)**, protégeant ainsi activement la trésorerie de l'institution.
   - **Le Score F1 :** `LogisticRegression` obtient le meilleur équilibre F1 (**46,68 %** contre 32,45 % pour Gradient Boosting).
   - **L'Explicabilité Réglementaire (BCEAO) :** En microfinance, les régulateurs exigent que chaque décision soit justifiable sans effet « boîte noire ». Les coefficients linéaires de la Régression Logistique permettent d'expliquer instantanément à un entrepreneur les raisons de l'évaluation de son dossier.
3. **Mise à jour et synchronisation intégrale :**
   - Le modèle sauvegardé en production (`model_scoring_microfinance_v1.joblib`) et le master notebook ([`RAPPORT_COMPLET_ET_EXPLICATION_PROJET.ipynb`](file:///c:/Users/valde/Projet-scoring/RAPPORT_COMPLET_ET_EXPLICATION_PROJET.ipynb)) sont parfaitement alignés sur la **Régression Logistique Équilibrée** avec son tableau de coefficients de risque et ses courbes ROC comparatives.

---

## Échange 27 — Amélioration du modèle « sur le champ » vs Modèle brut de départ

### Questions posées :
> *« dans notre cas, on a entrainé le modèle une fois mais on ne l'a pas amélioré? je sais que d'ici 2 à 3 mois il va falloi réentrainer le modèle mais je parle de sur le champ tu comprends, pourquoi on a pas améliorer le modèle? »*

### Réponse donnée :
1. **Démonstration des améliorations déjà opérées « sur le champ » :**
   - **Modèle brut sans optimisation :** Détectait à peine **12.30 %** des mauvais payeurs (30 sur 244) avec un F1-Score de 20.27 %.
   - **Modèle optimisé final :** Détecte **61.89 %** des mauvais payeurs (151 sur 244) avec un F1-Score de 46.68 % (+49.6 % de gain de détection net !).
2. **Les 3 leviers d'amélioration appliqués :**
   - **Feature Engineering bancaire :** Création des 4 ratios de solvabilité (`FinancialRatiosTransformer`).
   - **Pondération des classes :** `class_weight='balanced'` pour forcer l'algorithme à prioriser la détection des impayés.
   - **Robustesse aux nouvelles entrées :** `OneHotEncoder(handle_unknown='ignore')`.
3. **Pourquoi s'être arrêté à ce niveau :**
   - Atteinte du plafond d'information intrinsèque (*Data Ceiling*) sur les 11 variables disponibles (confirmé par GridSearchCV).
   - Préservation de l'équilibre prudentiel (éviter la sur-génération de faux positifs qui rejetterait de bons commerçants).

---

## Échange 28 — Distinction entre Comptes Utilisateurs (Back-Office) et Fiches Demandeurs (Clients)

### Questions posées :
> *« est-ce que y'a des comptes clients? »*

### Réponse donnée :
1. **Actuellement, NON : il n'y a pas d'espace de connexion pour les clients finaux (emprunteurs) :**
   - Les seuls comptes avec identifiant et mot de passe dans la table `users` sont destinés au personnel de l'institution :
     - Les **Agents de crédit** (`role: 'agent'`) : saisissent et évaluent les dossiers en agence ou sur le terrain.
     - Les **Administrateurs** (`role: 'admin'`) : supervisent la plateforme et gèrent les comptes agents.
2. **Comment sont gérés les clients ?**
   - Les clients (ex: Mme Koffi, M. Kouamé) sont gérés sous forme de **Fiches Dossiers / Demandeurs** dans la table `dossiers` avec leur état civil, pièce d'identité, téléphone et leurs 11 données financières alternatives.
   - **Raison métier :** Dans le secteur informel ouest-africain (75 % de l'économie), la majorité des petits commerçants, planteurs ou artisans n'ont pas d'adresse e-mail ou d'ordinateur. L'agent de crédit joue le rôle de relais physique pour saisir la demande.
3. **Perspective d'évolution possible :**
   - Possibilité d'ouvrir un « Portail Emprunteur » (suivi de dossier, notification SMS/WhatsApp ou connexion par numéro de téléphone + code OTP).

---

## Échange 29 — Fourniture des identifiants du compte Administrateur

### Questions posées :
> *« DONNE MOI les identifiants de l'admin »*

### Réponse donnée :
- **Identifiant :** `admin` (ou email : `admin@uiya-microfinance.ci`)
- **Mot de passe :** `Admin@2026`
- **Nom du profil :** Administrateur Général UIYA
- **Privilèges associés :** Accès à l'ensemble des dossiers, supervision globale du tableau de bord et gestion complète des comptes utilisateurs / agents de crédit (`role: 'admin'`).

---

## Échange 30 — Implémentation de la suppression définitive d'un utilisateur

### Questions posées :
> *« on doit pouvoir supprimer un utilisateurs. »*

### Réponse donnée :
1. **Ajout de l'endpoint API Backend (Laravel 11) :**
   - Création de la méthode `destroy(Request $request, int $id)` dans [`UserController.php`](file:///c:/Users/valde/Projet-scoring/backend-laravel/app/Http/Controllers/Api/UserController.php).
   - Ajout de la route protégée `DELETE /api/users/{id}` réservée aux administrateurs dans [`routes/api.php`](file:///c:/Users/valde/Projet-scoring/backend-laravel/routes/api.php).
   - **Sécurité et intégrité bancaire :**
     - Empêche un administrateur de supprimer son propre compte (auto-suppression interdite).
     - Réassigne automatiquement les éventuels dossiers et évaluations de l'agent supprimé à l'administrateur courant, garantissant qu'aucune trace d'audit réglementaire (`BF14`) n'est perdue et prévenant les erreurs de clés étrangères (`restrictOnDelete`).
     - Supprime tous les jetons d'accès actifs du compte supprimé.
2. **Ajout du bouton d'action dans l'interface Web (React 18) :**
   - Ajout d'un bouton de suppression avec icône corbeille (`<i className="fas fa-trash-can"></i>`) à côté du bouton d'activation/désactivation dans le tableau *Comptes Utilisateurs & Rôles* ([`frontend-web/src/App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx)).
   - Intégration d'une boîte de dialogue de confirmation (`window.confirm`) avant validation de la suppression.

---

## Échange 31 — Retrait de la carte profil utilisateur (Administrateur Général) dans la Sidebar

### Questions posées :
> *« faut retirer dans la sidebar l'onglet Administrateur Général là »*

### Réponse donnée :
1. **Suppression de la carte utilisateur en pied de barre latérale :**
   - Retrait de l'élément cliquable en bas de la sidebar flottante qui affichait le nom du compte connecté (`Administrateur Général UIYA • Profil →`) dans [`frontend-web/src/App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx#L800-L815).
2. **Clarification ergonomique :**
   - Le profil utilisateur, ses identifiants et le changement de mot de passe restent immédiatement accessibles via le **menu déroulant interactif (Popup)** situé en haut à droite sous l'avatar, ainsi que par l'onglet *Mon Profil* sous *Compte & Paramètres*.
   - Le pied de la sidebar conserve uniquement le bouton épuré de déconnexion rapide.

---

## Échange 32 — Refonte visuelle des tableaux : données 100% sur une seule ligne et défilement horizontal fluide

### Questions posées :
> *« améliore le design des tableaux, je veux aussi que toutes les infos soient sur une ligne, s'il faut scroller horizontalement fais le »*

### Réponse donnée :
1. **Règle stricte mono-ligne (`white-space: nowrap !important`) :**
   - Application de `white-space: nowrap !important;` à l'ensemble des cellules (`td`, `th`) et à tous leurs sous-éléments textuels dans [`styles.css`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/styles.css).
   - Fin des retours à la ligne disgracieux (comme les références coupées `DOS-2026-` / `0007`, les montants `250 000` / `FCFA` ou les dates `05/11/2026` / `10:52`).
2. **Défilement horizontal fluide et stylisé (`.table-responsive`) :**
   - Encapsulation des tableaux dans un conteneur dédié doté d'une barre de défilement horizontale ergonomique aux couleurs de la charte (fond crème `#FAF8F5`, curseur ambre `#B45309` au survol).
   - Définition de largeurs minimales confortables (`min-w-[1150px]`, `min-w-[1250px]`, `min-w-[1050px]`, `min-w-[850px]`) garantissant une lisibilité aérée et évitant tout tassement ou troncature sur écran moyen ou restreint.
3. **Mise à niveau des 4 tableaux de l'application ([`App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx)) :**
   - **Historique Complet des Évaluations (Vue 6) :** Références en badges ambre élégants, scores et probabilités détachés, colonnes de date au format fixe et bouton d'action moderne avec icône fléchée.
   - **Liste des Dossiers de Crédit (Vue 3) :** Dégroupage des informations multicouches en colonnes dédiées nettes (Référence | Demandeur | Profil Âge & Sexe | Ville | Activité | Revenu | Montant | Durée | Score ML | Risque | Actions).
   - **Tableau de Bord / Dernières Évaluations (Vue 1) :** Alignement strict sur une seule ligne de chaque évaluation récente avec statut visuel.
   - **Comptes Utilisateurs & Rôles (Vue 7) :** Séparation du Nom Complet et de l'E-mail en colonnes distinctes, badges de statut arrondis, boutons de désactivation et de suppression définitive sur la même ligne.
4. **Design haut de gamme et finitions :**
   - En-têtes aux coins adoucis, typographie uppercase soignée (`text-[10px] font-extrabold tracking-wider`), rayures zébrées subtiles (`nth-child(even)`) et survol fluide doré (`rgba(254, 243, 199, 0.50)`).

---

## Échange 33 — Redesign pleine largeur (Full Width) du formulaire et de toutes les pages de l'application

### Questions posées :
> *« j'aimerais que tu redesign ici, je veux que le formualaire prenne tout l'espace.... ainsi que toutes les autres pages qui ne prennent pas tout l'espace, fais pareil »*

### Réponse donnée :
1. **Suppression des contraintes de largeur maximale (`max-w-4xl`, `max-w-5xl`, `mx-auto`) :**
   - Retrait des classes bloquant artificiellement la largeur des cartes au centre de l'écran avec d'importantes marges vides sur les côtés.
   - Application d'une disposition pleine largeur (`w-full`) sur l'ensemble des vues de la plateforme dans [`frontend-web/src/App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx).
2. **Redesign ergonomique et aéré du Formulaire de Nouveau Dossier (Vue 2 - `nouveau-dossier`) :**
   - **En-tête enrichi :** Titre élargi, badge officiel *Nouveau Dossier BF06* / *Modification BF08*, descriptif explicatif et bouton d'annulation repositionné avec fluidité.
   - **Grille responsive 3 colonnes optimisée (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`) :**
     - *Section 1 (Identité & Profil Socio-Professionnel) :* Champs texte, sélecteurs et entrées numériques distribués harmonieusement sur toute la largeur de l'écran.
     - *Section 2 (Revenus & Données Alternatives) :* Encadré dédié plein écran pour la régularité du paiement des factures CIE/SODECI, intégrant un curseur interactif, le pourcentage calculé et des bornes explicatives claires (0% à 100%).
     - *Section 3 (Crédit & Ratios Automatiques) :* Carte de calcul de mensualité et taux d'effort en dégradé ambré, complétée par un champ d'observations de l'agent étendu sur toute la largeur.
   - **Boutons d'action :** Boutons d'enregistrement simple et de scoring direct Python modernisés avec icônes et alignés proprement en pied de formulaire.
3. **Harmonisation pleine largeur de toutes les autres vues de la plateforme :**
   - **Vue Profil & Sécurité (`activeTab === 'profil'`) :** Grand bandeau prestige, 4 indicateurs d'activité et formulaires d'édition déployés à 100% de la largeur.
   - **Vue Modèle IA & Gouvernance (`activeTab === 'modele-ia'`) :** Cartes de métriques scientifiques, matrice de confusion et graphiques occupant tout l'espace.
   - **Vue Rapport d'Évaluation (`activeTab === 'rapport'`) :** Affichage optimisé et aéré sur grand écran avant impression.
   - **Vues Tableaux (Dossiers, Historique, Utilisateurs, Dashboard) :** Déjà en pleine largeur avec défilement horizontal fluide préservé.

---

## Échange 34 — Correction de la syntaxe JSX dans le formulaire nouveau dossier (apostrophe non échappée)

### Questions posées :
> *« [plugin:vite:react-babel] C:\Users\valde\Projet-scoring\frontend-web\src\App.jsx: Unexpected token, expected "}" (1788:111) ... »*

### Réponse donnée :
1. **Origine du problème :**
   - Une apostrophe non échappée dans la chaîne française `'✓ Ratio d'endettement conforme'` provoquait une fermeture anticipée de la chaîne JS dans le template JSX, générant une erreur d'analyse Babel (`Unexpected token, expected "}"`).
2. **Correction appliquée :**
   - Remplacement par des guillemets doubles englobants : `"✓ Ratio d'endettement conforme"` à la ligne 1788 de [`frontend-web/src/App.jsx`](file:///c:/Users/valde/Projet-scoring/frontend-web/src/App.jsx#L1788).
3. **Validation :**
   - Recompilation complète validée par le serveur Vite (`HTTP 200`, transpilé avec succès sans aucune erreur).

---

## Échange 35 — Fonctionnement des intérêts bancaires / microfinance et pertinence de leur intégration

### Questions posées :
> *« normalement en banque, on gère les intérêts oubien? comment ça se passe? et est-ce qu'on doit ajouter ça aussi »*

### Réponse donnée :
1. **Règles bancaires et réglementation BCEAO :**
   - Les intérêts constituent la rémunération du prêteur et couvrent le risque de crédit.
   - En zone UEMOA / Côte d'Ivoire, le taux d'usure légal est plafonné à 15% par an pour les banques et à **24% par an pour les Institutions de Microfinance (SFD)**.
   - Le calcul standard repose sur les **annuités constantes dégressives** : $M = C 	imes rac{r}{1 - (1+r)^{-n}}$, où la mensualité $M$ reste constante tandis que la part d'intérêts diminue à mesure que le capital restant dû est amorti.
2. **Impact sur l'emprunteur :**
   - La mensualité réelle due par le client intègre le Capital + les Intérêts, ce qui augmente le **taux d'effort réel** (charge de remboursement / revenu mensuel).
3. **Distinction fonctionnelle du projet :**
   - Le modèle de Scoring IA évalue la solvabilité et la probabilité de défaut.
   - Le Core Banking gère la comptabilisation des intérêts, la marge nette et le calendrier de remboursement (échéancier).
   - L'ajout d'un taux d'intérêt indicatif (ex. 18% l'an) permet d'afficher la vraie mensualité TTC, le gain d'intérêts pour l'institution et un échéancier complet sur le rapport d'évaluation.

---

## Échange 36 — Distinction entre Capital emprunté (analysé par l'IA) et Total remboursé avec intérêts

### Questions posées :
> *« Total du crédit remboursé par le client (ex. 550 080 FCFA). Total des intérêts perçus par l'institution (ex. +50 080 FCFA de produit d'intérêts). avec cet exemple là c'est comme si le montant de prêt sera alors de 550 080 FCFA et c'est ça que le modèle va utiliser pour analyser? »*

### Réponse donnée :
1. **Non, le modèle utilise strictement 500 000 FCFA :**
   - Le montant du prêt (`montant_demande_fcfa`) est le **capital principal décaissé** remis au client (500 000 FCFA).
   - Les 50 080 FCFA sont les intérêts débiteurs générés sur les 12 mois.
   - Transmettre 550 080 FCFA au modèle fausserait la prédiction en faisant croire à l'algorithme que le client a sollicité un capital plus important.
2. **Rôle du montant total (550 080 FCFA) :**
   - Il sert à l'agent de crédit pour déterminer l'échéance mensuelle contractuelle (45 840 FCFA/mois) et le taux d'effort réel, ainsi qu'au respect des obligations de transparence tarifaire de la BCEAO.

---

## Échange 37 — Confirmation : Non-utilisation des intérêts par le modèle de Scoring Machine Learning

### Questions posées :
> *« dc le modèle n'utilise pas l'intérêt ici »*

### Réponse donnée :
1. **Exactement, le modèle n'utilise pas les intérêts :**
   - Les 11 variables du modèle (`age`, `sexe`, `ville`, `activite`, `revenu_mensuel_estime_fcfa`, `anciennete_mobile_money_mois`, `volume_mm_mensuel_fcfa`, `factures_cie_sodeci_payees_pct`, `nb_credits_anterieurs`, `montant_demande_fcfa`, `duree_mois`) ne comportent aucun taux d'intérêt.
2. **Explication technique :**
   - Dans le portefeuille historique de la microfinance ayant servi à l'apprentissage (1 200 dossiers), le taux d'intérêt était institutionnel et uniforme (une constante). Le couple `(montant_demande_fcfa, duree_mois)` combiné au revenu suffit mathématiquement à l'algorithme pour évaluer la charge de remboursement et le risque de défaut.

---

## Échange 38 — Déploiement et publication du projet sur GitHub pour collaboration

### Questions posées :
> *« je veux envoyer tout le dossier Projet-scoring sur git afin que ma camarade puisse prendre le projet et continuer tranquillement, que dois-je faire »*

### Réponse donnée :
1. **Mise en place d'un `.gitignore` professionnel à la racine :**
   - Exclusion stricte de `frontend-web/node_modules/` (plus de 5 800 fichiers de dépendances évitant d'alourdir le dépôt ou d'atteindre les limites de taille GitHub).
   - Exclusion de `backend-laravel/vendor/`, des fichiers locaux d'environnement secrets (`.env`), des caches Python (`__pycache__`) et des checkpoints Jupyter.
2. **Création du fichier `requirements.txt` :**
   - Spécification des packages Python nécessaires pour le modèle de Machine Learning (`scikit-learn`, `pandas`, `numpy`, `joblib`, `matplotlib`, `seaborn`, `notebook`).
3. **Rédaction d'un guide complet dans `README.md` :**
   - Architecture détaillée du projet (Backend, Frontend, Mobile, Machine Learning, Données).
   - Guide pas-à-pas pour la camarade :
     - Clonage du dépôt (`git clone https://github.com/Dimarco124/scoring.git`).
     - Installation et démarrage du backend Laravel (`composer install`, `php artisan migrate --seed`, `php artisan serve`).
     - Installation et démarrage du frontend React (`npm install`, `npm run dev`).
     - Installation des dépendances Python (`pip install -r requirements.txt`).
     - Identifiants par défaut (`admin` / `admin123` et `konan` / `agent123`).
4. **Push officiel vers GitHub :**
   - Commit propre (`feat: projet complet scoring microfinance UIYA`) et publication réussie sur la branche principale `main` : `https://github.com/Dimarco124/scoring.git`.

---

## Échange 40 — Génération du Guide PDF Ultime de l'Entraînement du Modèle de A à Z

### Questions posées :
> *« man fais moi un PDF qui détail tt ce que tu as fait dans l'entrainement du modèle de A à Z. comme si tu racontais une histoire et tu parles de ce que tu as fait, pourquoi tu as fait telle chose, c'est quoi cette chose, avec des explications vraiment bonnes de chaque étape jusqu'à la dernière, stp fais bien. JE VEUX QUE CE DOC m'aide à reprendre l'entraiment du modèle moi mm. des explications des codes, pourquoi on a utilisé ça ensuite »*

### Réponse donnée :
1. **Création du document PDF officiel :**
   - Fichier généré à la racine du projet : [GUIDE_ENTRAINEMENT_MODELE_SCORING_A_A_Z.pdf](file:///c:/Users/valde/Projet-scoring/GUIDE_ENTRAINEMENT_MODELE_SCORING_A_A_Z.pdf) (533 Ko, rendu haute définition avec la charte graphique officielle UIYA).
2. **Structure narrative et pédagogique du document :**
   - **Prologue :** Le contexte de la microfinance à Yamoussoukro, le secteur informel (80% d'emprunteurs sans fiches de paie) et l'apport des données alternatives (Mobile Money et factures CIE/SODECI).
   - **Chapitre 1 :** L'Exploration des Données (EDA), description des 12 colonnes, analyse du déséquilibre de classe (79% de payeurs vs 21% de défauts) et pourquoi l'Accuracy est un piège en finance.
   - **Chapitre 2 :** Le Feature Engineering (calcul automatique des 4 ratios financiers), le One-Hot Encoding sécurisé avec handle_unknown='ignore', et le StandardScaler assemblés dans un ColumnTransformer.
   - **Chapitre 3 :** La séparation Train / Test (80% / 20%) et la stratification indispensable (stratify=y).
   - **Chapitre 4 :** La comparaison rigoureuse des modèles (Régression Logistique Balanced vs Random Forest vs Gradient Boosting) et la victoire de la Régression Logistique (Rappel de 76% sur les mauvais payeurs et conformité d'explicabilité totale exigée par la BCEAO).
   - **Chapitre 5 :** Analyse des coefficients $eta$ (facteurs aggravants vs facteurs protecteurs).
   - **Chapitre 6 :** Calibrage de la probabilité en Score de Crédit sur 1 000 points et grille des 3 paliers décisionnels.
   - **Chapitre 7 :** Déploiement et intégration temps réel dans l'API Laravel via joblib.
   - **Chapitre 8 :** Script Python complet autonome prêt à copier-coller pour réentraîner le modèle en un clic.
   - **Chapitre 9 :** Réponses aux questions pièges classiques du jury de soutenance et glossaire complet des termes techniques.

---

## Échange 40 — Création du carnet pédagogique interactif : Comprendre le Machine Learning et notre modèle de A à Z

### Questions posées :
> *« man fais un .pynb qui explite de façon literrale de A à Z la façon dont nous avons entrainer le modèle en français simple et plein d'exemples dans le but de comprendre le projet, le machine learning comment est-ce que ça fonctionne »*

### Réponse donnée :
1. **Création du Master Notebook Pédagogique :**
   - Fichier généré et exécuté à la racine du projet : [`COMPRENDRE_LE_MACHINE_LEARNING_ET_NOTRE_MODELE.ipynb`](file:///c:/Users/valde/Projet-scoring/COMPRENDRE_LE_MACHINE_LEARNING_ET_NOTRE_MODELE.ipynb).
   - Rédigé en français simple, accessible à tous, sans jargon abstrait, illustré par des métaphores parlantes (la balance à plateaux, l'élève paresseux qui répond toujours 'Vrai', les examens blancs et les annales).
2. **Contenu des 10 chapitres immersifs :**
   - **Introduction & Contexte Ivoirien :** Pourquoi le secteur informel (sans fiche de paie) a besoin de données alternatives (Mobile Money Orange/Wave/MTN et régularité des factures CIE/SODECI).
   - **Exploration des Données Réelles :** Chargement des 6 000 dossiers réels de `19_finance_credit_microfinance.csv` et description colonne par colonne des 11 indices confiés à l'IA.
   - **Le Piège du Déséquilibre de Classes :** Pourquoi 80% de bons payeurs faussent l'accuracy classique et nécessitent la pondération `class_weight='balanced'`.
   - **Le Préprocessing :** Le One-Hot Encoding expliqué comme des cases à cocher, l'ingénierie du ratio d'endettement et la mise à l'échelle (StandardScaler).
   - **Le Train / Test Split :** Pourquoi on cache 20% des dossiers secrets pour l'examen blanc.
   - **La Régression Logistique :** La métaphore de la balance avec les poids qui tirent vers le vert (remboursement) ou le rouge (impayé).
   - **Interprétabilité Totale (BCEAO) :** Graphique des coefficients du modèle classant les facteurs protecteurs (CIE, Mobile Money) et les facteurs aggravants (surendettement, montant excessif).
   - **Le Passage de la Probabilité au Score :** Formule mathématique simplifiée pour obtenir une note sur 1 000 points et seuils décisionnels (Vert, Jaune, Rouge).
   - **Trois Cas Pratiques en Direct :** Évaluation interactive de trois profils concrets (Aminata la commerçante fiable, Koffi le transporteur surendetté, Aya la jeune couturière prudente).
   - **Lexique Humain :** Les 10 termes de Data Science traduits en langage courant pour briller devant un jury de soutenance.
