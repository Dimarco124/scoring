import React, { useState } from 'react';
import { Smartphone, Play, FolderPlus, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatFcfa } from '../api';
import { RiskBadge } from './ScoreGauge';

export default function MobileSimulatorView({
  user,
  dossiers,
  onSelectDossier,
  onRunScoring,
  onOpenNewDossier,
  scoringLoadingId,
}) {
  const [mobileScreen, setMobileScreen] = useState('list'); // 'list' | 'detail'
  const [mobileDossier, setMobileDossier] = useState(dossiers[0] || null);

  const openDetailOnPhone = (d) => {
    setMobileDossier(d);
    setMobileScreen('detail');
  };

  return (
    <div className="grid-2" style={{ gridTemplateColumns: '1fr 410px', alignItems: 'start', gap: 28 }}>
      {/* Colonne Gauche : Explication architecture React Native (BF20, BNF11) */}
      <div className="card">
        <span className="badge badge-encours" style={{ marginBottom: 10 }}>
          <Smartphone size={13} /> Application Mobile React Native (BF20 & BNF11)
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          Application Mobile Agent de Terrain
        </h2>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 18 }}>
          Le code source complet de l'application mobile <strong>React Native (Expo)</strong> est
          disponible dans le dossier <code>mobile-app/</code> du projet et connecté à la même API
          REST Laravel & MySQL. Utilisez le téléphone interactif ci-contre pour démontrer ses
          fonctionnalités en direct devant le jury.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#B45309', marginBottom: 4 }}>
              1. Connexion & Sécurité (BF01)
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              Authentification par jeton Bearer partagé avec Laravel et blocage des comptes inactifs.
            </div>
          </div>

          <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#B45309', marginBottom: 4 }}>
              2. Saisie Terrain Ergonomique (BNF11)
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              Boutons tactiles larges pour saisir les données Mobile Money et CIE/SODECI en clientèle.
            </div>
          </div>

          <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#B45309', marginBottom: 4 }}>
              3. Lancement du Scoring (BF11)
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              Envoi des 11 variables au modèle Python et réception du score en quelques secondes.
            </div>
          </div>

          <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#B45309', marginBottom: 4 }}>
              4. Résultat Lisible sur 1000 (BF13)
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B' }}>
              Jauge de progression colorée (Faible, Moyen, Élevé) et mention d'aide à la décision.
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 14,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 12,
            fontSize: 13,
            color: '#B45309',
          }}
        >
          <strong>Architecture des fichiers React Native créés :</strong>
          <ul style={{ marginTop: 6, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>
              <code>mobile-app/App.js</code> : Écrans Connexion, Liste des dossiers, Création et
              Résultat du scoring.
            </li>
            <li>
              <code>mobile-app/src/components/MobileScoreCard.js</code> : Carte de score sur 1000
              adaptée aux écrans de téléphone.
            </li>
            <li>
              <code>mobile-app/src/api/client.js</code> : Client HTTP connecté au backend Laravel.
            </li>
          </ul>
        </div>
      </div>

      {/* Colonne Droite : Châssis Smartphone Interactif */}
      <div
        style={{
          width: 390,
          margin: '0 auto',
          background: '#0F172A',
          borderRadius: 42,
          padding: 12,
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '4px solid #334155',
        }}
      >
        {/* Encoche haut-parleur téléphone */}
        <div
          style={{
            width: 110,
            height: 6,
            background: '#334155',
            borderRadius: 999,
            margin: '4px auto 10px',
          }}
        />

        {/* Écran interne du téléphone (Thème Clair) */}
        <div
          style={{
            background: '#F8FAFC',
            borderRadius: 30,
            height: 670,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* En-tête de l'application mobile */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '14px 16px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <img src="/images/uiya-badge.svg" alt="UIYA" style={{ width: 32, height: 32 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>
                  FinScore Mobile
                </div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{user.nom_complet}</div>
              </div>
            </div>
            <span className="badge badge-faible" style={{ fontSize: 10.5 }}>
              En ligne
            </span>
          </div>

          {/* Barre de navigation interne mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 6,
              padding: '8px 12px',
              background: '#FFFFFF',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <button
              className={`btn btn-sm ${mobileScreen === 'list' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setMobileScreen('list')}
            >
              Dossiers ({dossiers.length})
            </button>
            <button className="btn btn-sm btn-outline" onClick={onOpenNewDossier}>
              <FolderPlus size={13} /> + Nouveau
            </button>
          </div>

          {/* Contenu déroulant du téléphone */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {mobileScreen === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dossiers.map((d) => {
                  const ev = d.derniere_evaluation;
                  return (
                    <div
                      key={d.id}
                      onClick={() => openDetailOnPhone(d)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 14,
                        padding: 13,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 5,
                        }}
                      >
                        <span className="font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#B45309' }}>
                          {d.reference}
                        </span>
                        <RiskBadge niveau={ev?.niveau_risque} />
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0F172A' }}>
                        {d.nom_demandeur} {d.prenom_demandeur}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 8 }}>
                        {d.age} ans • {d.ville} • {d.activite}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: 8,
                          borderTop: '1px solid #F1F5F9',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10.5, color: '#64748B' }}>Montant demandé</div>
                          <div className="font-mono" style={{ fontSize: 13, fontWeight: 800 }}>
                            {formatFcfa(d.montant_demande_fcfa)}
                          </div>
                        </div>

                        <div className="font-mono" style={{ fontSize: 13, fontWeight: 800, color: '#D97706' }}>
                          {ev ? `${ev.score} / 1000 →` : 'Scorer →'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {mobileScreen === 'detail' && mobileDossier && (
              <div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginBottom: 10 }}
                  onClick={() => setMobileScreen('list')}
                >
                  <ArrowLeft size={13} /> Retour aux dossiers
                </button>

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E2E8F0',
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <div className="font-mono" style={{ fontSize: 12, fontWeight: 800, color: '#B45309' }}>
                    {mobileDossier.reference}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>
                    {mobileDossier.nom_demandeur} {mobileDossier.prenom_demandeur}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                    {mobileDossier.age} ans • {mobileDossier.ville} • {mobileDossier.activite}
                  </div>

                  {mobileDossier.derniere_evaluation ? (
                    <div
                      style={{
                        background: '#F8FAFC',
                        borderRadius: 12,
                        padding: 12,
                        border: '1px solid #E2E8F0',
                        textAlign: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>
                        SCORE DE SOLVABILITÉ SUR 1000
                      </div>
                      <div
                        className="font-display"
                        style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', marginVertical: 4 }}
                      >
                        {mobileDossier.derniere_evaluation.score}{' '}
                        <span style={{ fontSize: 14, color: '#64748B' }}>/ 1000</span>
                      </div>
                      <RiskBadge niveau={mobileDossier.derniere_evaluation.niveau_risque} />
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                        Probabilité de défaut :{' '}
                        <strong>{mobileDossier.derniere_evaluation.probabilite_defaut_pct}%</strong> |
                        Modèle : <strong>{mobileDossier.derniere_evaluation.version_modele}</strong>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 12,
                        background: '#FFFBEB',
                        borderRadius: 10,
                        fontSize: 12,
                        color: '#B45309',
                        marginBottom: 10,
                      }}
                    >
                      Ce dossier est en attente d'évaluation par le modèle Python.
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={scoringLoadingId === mobileDossier.id}
                    onClick={async () => {
                      await onRunScoring(mobileDossier.id);
                    }}
                  >
                    <Play size={15} />{' '}
                    {scoringLoadingId === mobileDossier.id
                      ? 'Calcul Python en cours...'
                      : 'Lancer le Scoring Python (BF11)'}
                  </button>

                  <button
                    className="btn btn-outline btn-sm"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => onSelectDossier(mobileDossier.id)}
                  >
                    Ouvrir la fiche complète Web
                  </button>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: '1px solid #E2E8F0',
                    padding: 13,
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#B45309', marginBottom: 8 }}>
                    Variables Clés (Mobile Money & CIE/SODECI)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Revenu mensuel</span>
                    <strong className="font-mono">{formatFcfa(mobileDossier.revenu_mensuel_estime_fcfa)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Montant demandé</span>
                    <strong className="font-mono">{formatFcfa(mobileDossier.montant_demande_fcfa)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <span style={{ color: '#64748B' }}>Ancienneté Mobile Money</span>
                    <strong className="font-mono">{mobileDossier.anciennete_mobile_money_mois} mois</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                    <span style={{ color: '#64748B' }}>Factures CIE/SODECI</span>
                    <strong className="font-mono">{Math.round(mobileDossier.factures_cie_sodeci_payees_pct * 100)} %</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

