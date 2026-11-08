import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Cpu, Clock } from 'lucide-react';
import { formatDateTime } from '../api';

export function RiskBadge({ niveau }) {
  if (!niveau) {
    return <span className="badge badge-encours">En attente de scoring</span>;
  }
  const normalized = String(niveau).toLowerCase();
  if (normalized.includes('faible')) {
    return (
      <span className="badge badge-faible">
        <ShieldCheck size={13} /> Risque Faible
      </span>
    );
  }
  if (normalized.includes('moyen')) {
    return (
      <span className="badge badge-moyen">
        <AlertTriangle size={13} /> Risque Moyen
      </span>
    );
  }
  return (
    <span className="badge badge-eleve">
      <ShieldAlert size={13} /> Risque Élevé
    </span>
  );
}

export default function ScoreGauge({ evaluation }) {
  if (!evaluation) {
    return (
      <div
        style={{
          padding: '28px 20px',
          textAlign: 'center',
          background: '#F8FAFC',
          borderRadius: 14,
          border: '1px dashed #CBD5E1',
        }}
      >
        <p style={{ fontWeight: 700, color: '#B45309', marginBottom: 6 }}>
          Aucune évaluation de scoring réalisée
        </p>
        <p style={{ fontSize: 13, color: '#64748B' }}>
          Cliquez sur « Lancer le Scoring Python » pour interroger le modèle Machine Learning.
        </p>
      </div>
    );
  }

  const score = Math.max(0, Math.min(1000, Number(evaluation.score ?? 0)));
  const ratio = score / 1000;
  const radius = 84;
  const circumference = Math.PI * radius; // Demi-cercle
  const strokeDashoffset = circumference * (1 - ratio);

  let strokeColor = '#059669'; // Vert (Faible risque)
  if (evaluation.niveau_risque === 'Moyen') {
    strokeColor = '#D97706'; // Ambre (Risque moyen)
  } else if (evaluation.niveau_risque === 'Élevé') {
    strokeColor = '#DC2626'; // Rouge (Risque élevé)
  }

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '22px 20px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
          Score de Solvabilité
        </span>
        <RiskBadge niveau={evaluation.niveau_risque} />
      </div>

      {/* Jauge SVG demi-cercle sur 1000 */}
      <div style={{ position: 'relative', width: 220, height: 128, margin: '8px auto 6px' }}>
        <svg viewBox="0 0 220 125" width="220" height="125">
          <path
            d="M 26 110 A 84 84 0 0 1 194 110"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 26 110 A 84 84 0 0 1 194 110"
            fill="none"
            stroke={strokeColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 8,
            textAlign: 'center',
          }}
        >
          <div
            className="font-display"
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1,
            }}
          >
            {score}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginTop: 2 }}>
            sur 1000 points
          </div>
        </div>
      </div>

      {/* Probabilité de défaut & métadonnées (BF13, BF14, BNF09) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginTop: 14,
          padding: 12,
          borderRadius: 12,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, color: '#64748B' }}>Probabilité de défaut</div>
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: strokeColor }}>
            {Number(evaluation.probabilite_defaut_pct).toFixed(2)} %
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: '#64748B' }}>Version du modèle</div>
          <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Cpu size={14} /> {evaluation.version_modele || 'v1.0.0'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11.5,
          color: '#64748B',
          marginTop: 10,
          padding: '0 4px',
        }}
      >
        <span>Évalué le {formatDateTime(evaluation.created_at)}</span>
        {evaluation.temps_reponse_ms != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> {evaluation.temps_reponse_ms} ms
          </span>
        )}
      </div>

      {/* Message réglementaire d'aide à la décision (BF13, BNF14) */}
      <div
        style={{
          marginTop: 12,
          padding: '10px 12px',
          borderRadius: 10,
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          color: '#92400E',
          fontSize: 12,
          textAlign: 'left',
          lineHeight: 1.45,
        }}
      >
        <strong>Aide à la décision (BNF14) :</strong>{' '}
        {evaluation.message_analyse ||
          "Ce score est une estimation statistique. La décision finale d'octroi du crédit appartient à l'agent et à l'institution de microfinance."}
      </div>
    </div>
  );
}

