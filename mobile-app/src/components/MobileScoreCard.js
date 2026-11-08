import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function getRiskColors(niveau) {
  if (!niveau) {
    return {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1D4ED8',
      bar: '#2563EB',
      label: 'En attente de scoring',
    };
  }
  const n = String(niveau).toLowerCase();
  if (n.includes('faible')) {
    return {
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#059669',
      bar: '#10B981',
      label: 'Risque Faible',
    };
  }
  if (n.includes('moyen')) {
    return {
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#D97706',
      bar: '#F59E0B',
      label: 'Risque Moyen',
    };
  }
  return {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#DC2626',
    bar: '#EF4444',
    label: 'Risque Élevé',
  };
}

export default function MobileScoreCard({ evaluation }) {
  if (!evaluation) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Aucun score calculé pour ce dossier</Text>
        <Text style={styles.emptySub}>
          Appuyez sur le bouton « Lancer le Scoring Python » ci-dessous pour obtenir l'estimation du
          risque de défaut.
        </Text>
      </View>
    );
  }

  const score = Math.max(0, Math.min(1000, Number(evaluation.score || 0)));
  const colors = getRiskColors(evaluation.niveau_risque);
  const progressPct = `${Math.round((score / 1000) * 100)}%`;

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <Text style={styles.cardHeaderLabel}>RÉSULTAT DU SCORING (BF13)</Text>
        <View style={[styles.riskPill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.riskPillText, { color: colors.text }]}>{colors.label}</Text>
        </View>
      </View>

      {/* Score géant sur 1000 */}
      <View style={styles.scoreCenter}>
        <Text style={[styles.scoreValue, { color: colors.text }]}>{score}</Text>
        <Text style={styles.scoreScale}>/ 1000 points</Text>
      </View>

      {/* Barre de jauge mobile */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: progressPct, backgroundColor: colors.bar },
          ]}
        />
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleText}>0 (Risque Élevé)</Text>
        <Text style={styles.scaleText}>700</Text>
        <Text style={styles.scaleText}>1000 (Sûr)</Text>
      </View>

      {/* Métriques détaillées */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Probabilité de défaut</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {Number(evaluation.probabilite_defaut_pct).toFixed(2)} %
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Modèle Python (BF14)</Text>
          <Text style={styles.metricValue}>{evaluation.version_modele || 'v1.0.0'}</Text>
        </View>
      </View>

      {/* Message d'aide à la décision (BF13 / BNF14) */}
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Aide à l'analyse (BNF14) :</Text>
        <Text style={styles.disclaimerText}>
          {evaluation.message_analyse ||
            "Ce score est une estimation statistique. La décision finale d'octroi du crédit appartient à l'agent et à l'institution de microfinance."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  riskPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreCenter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 8,
  },
  scoreValue: {
    fontSize: 44,
    fontWeight: '800',
  },
  scoreScale: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 14,
  },
  scaleText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  metricLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  disclaimerBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 17,
  },
});

