-- ============================================================================
-- BASE DE DONNÉES MYSQL : PLATEFORME DE SCORING DE CRÉDIT MICROFINANCE
-- Université Internationale de Yamoussoukro (UIYA) - Licence 3 Génie Logiciel
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `scoring_microfinance`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `scoring_microfinance`;

-- ----------------------------------------------------------------------------
-- 1. TABLE `users` : Administrateurs et Agents de crédit (BF01 à BF05, BNF01, BNF02)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nom_complet` VARCHAR(150) NOT NULL,
  `identifiant` VARCHAR(80) NOT NULL UNIQUE COMMENT 'Identifiant de connexion (ex: admin01, agent.konan)',
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `telephone` VARCHAR(30) NULL,
  `password` VARCHAR(255) NOT NULL COMMENT 'Mot de passe haché avec Bcrypt (BNF02)',
  `role` ENUM('admin', 'agent') NOT NULL DEFAULT 'agent' COMMENT 'Rôle (BF04, BNF01)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Compte actif, 0 = Compte désactivé (BF01, BF03)',
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  `remember_token` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role_active` (`role`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABLE `dossiers` : Demandes de crédit (BF06 à BF10, BNF08)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `dossiers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference` VARCHAR(30) NOT NULL UNIQUE COMMENT 'Référence unique du dossier (ex: DOS-2026-0001) - BF09',
  `agent_id` BIGINT UNSIGNED NOT NULL COMMENT 'Agent ayant créé le dossier',

  -- Informations d'identité du demandeur (BF06)
  `nom_demandeur` VARCHAR(100) NOT NULL,
  `prenom_demandeur` VARCHAR(120) NOT NULL,
  `telephone_demandeur` VARCHAR(30) NULL,
  `numero_piece_identite` VARCHAR(60) NULL,

  -- Les 11 variables nécessaires au modèle de Machine Learning (BF06, BF12)
  `age` INT UNSIGNED NOT NULL,
  `sexe` ENUM('F', 'M') NOT NULL,
  `ville` VARCHAR(80) NOT NULL,
  `activite` VARCHAR(80) NOT NULL,
  `revenu_mensuel_estime_fcfa` DECIMAL(15, 2) NOT NULL,
  `anciennete_mobile_money_mois` INT UNSIGNED NOT NULL,
  `volume_mm_mensuel_fcfa` DECIMAL(15, 2) NOT NULL,
  `factures_cie_sodeci_payees_pct` DECIMAL(5, 4) NOT NULL COMMENT 'Valeur entre 0.0000 et 1.0000',
  `nb_credits_anterieurs` INT UNSIGNED NOT NULL DEFAULT 0,
  `montant_demande_fcfa` DECIMAL(15, 2) NOT NULL,
  `duree_mois` INT UNSIGNED NOT NULL,

  -- Suivi du dossier (BF08, BF17)
  `statut` ENUM('en_cours', 'evalue', 'favorable', 'defavorable') NOT NULL DEFAULT 'en_cours',
  `observations_agent` TEXT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_dossiers_reference` (`reference`),
  INDEX `idx_dossiers_statut` (`statut`),
  INDEX `idx_dossiers_ville_activite` (`ville`, `activite`),
  CONSTRAINT `fk_dossiers_agent`
    FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABLE `evaluations` : Résultats et historique du scoring (BF11 à BF16, BNF09)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `evaluations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dossier_id` BIGINT UNSIGNED NOT NULL,
  `agent_id` BIGINT UNSIGNED NOT NULL COMMENT 'Agent ayant lancé cette évaluation',
  `probabilite_defaut` DECIMAL(6, 4) NOT NULL COMMENT 'Probabilité entre 0.0000 et 1.0000',
  `probabilite_defaut_pct` DECIMAL(5, 2) NOT NULL COMMENT 'Probabilité en pourcentage (ex: 24.01)',
  `score` INT UNSIGNED NOT NULL COMMENT 'Score de solvabilité sur 1000 (ex: 760)',
  `niveau_risque` ENUM('Faible', 'Moyen', 'Élevé') NOT NULL COMMENT 'Niveau de risque (BF13)',
  `version_modele` VARCHAR(40) NOT NULL DEFAULT 'v1.0.0' COMMENT 'Version du modèle ML utilisée (BF14, BNF09)',
  `variables_transmises` JSON NOT NULL COMMENT 'Trace exacte des 11 variables envoyées à Python (BF12)',
  `message_analyse` TEXT NOT NULL COMMENT 'Rappel que le score est une aide à la décision (BF13, BNF14)',
  `temps_reponse_ms` INT UNSIGNED NULL COMMENT 'Temps de calcul en ms (BNF05)',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_evaluations_dossier` (`dossier_id`, `created_at`),
  INDEX `idx_evaluations_risque` (`niveau_risque`),
  CONSTRAINT `fk_evaluations_dossier`
    FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evaluations_agent`
    FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. TABLE `api_tokens` : Sessions sécurisées avec expiration (BF01, BF02, BNF03)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL UNIQUE,
  `device_name` VARCHAR(100) NULL DEFAULT 'web',
  `last_used_at` DATETIME NULL DEFAULT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_api_tokens_user` (`user_id`),
  CONSTRAINT `fk_api_tokens_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

