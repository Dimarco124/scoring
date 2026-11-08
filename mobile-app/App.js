import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import {
  mobileApiRequest,
  setApiBaseUrl,
  getApiBaseUrl,
  setAuthToken,
  formatFcfaMobile,
} from './src/api/client';
import MobileScoreCard, { getRiskColors } from './src/components/MobileScoreCard';

const VILLES = [
  'Yamoussoukro', 'Abidjan', 'Bouaké', 'Man', 'Korhogo',
  'San-Pédro', 'Daloa', 'Divo', 'Gagnoa', 'Abengourou',
];

const ACTIVITES = [
  { value: 'commerce', label: 'Commerce' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'couture', label: 'Couture' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'transport', label: 'Transport' },
  { value: 'salarie', label: 'Salarié(e)' },
];

const INITIAL_FORM = {
  nom_demandeur: '',
  prenom_demandeur: '',
  telephone_demandeur: '+225 07 ',
  numero_piece_identite: 'CI-',
  age: '34',
  sexe: 'F',
  ville: 'Yamoussoukro',
  activite: 'commerce',
  revenu_mensuel_estime_fcfa: '165000',
  anciennete_mobile_money_mois: '60',
  volume_mm_mensuel_fcfa: '140000',
  factures_cie_sodeci_payees_pct: '0.85',
  nb_credits_anterieurs: '1',
  montant_demande_fcfa: '250000',
  duree_mois: '12',
  observations_agent: '',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('list'); // 'list' | 'create' | 'detail'
  const [loading, setLoading] = useState(false);
  const [scoringInProgress, setScoringInProgress] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', text: '' }

  // Connexion (BF01, BF20)
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [identifiant, setIdentifiant] = useState('agent.grace');
  const [password, setPassword] = useState('Agent@2026');

  // Données chargées
  const [dashboard, setDashboard] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [selectedDossier, setSelectedDossier] = useState(null);

  // Recherche & Filtres (BF09)
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Formulaire de création (BF06, BF07, BF20)
  const [form, setForm] = useState(INITIAL_FORM);

  const showMessage = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  };

  const loadMobileData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (riskFilter === 'en_cours') {
        params.set('statut', 'en_cours');
      } else if (riskFilter) {
        params.set('niveau_risque', riskFilter);
      }

      const [dashRes, dosRes] = await Promise.all([
        mobileApiRequest('/dashboard'),
        mobileApiRequest(`/dossiers?${params.toString()}`),
      ]);
      setDashboard(dashRes.data);
      setDossiers(dosRes.data || []);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [user, searchQuery, riskFilter]);

  useEffect(() => {
    if (user && screen === 'list') {
      loadMobileData();
    }
  }, [user, screen, loadMobileData]);

  // 1. Connexion Mobile (BF01, BF20)
  const handleLogin = async () => {
    setFeedback(null);
    setApiBaseUrl(serverUrl);
    setLoading(true);
    try {
      const res = await mobileApiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifiant,
          password,
          device_name: 'Application Mobile React Native',
        }),
      });
      setAuthToken(res.data.token);
      setUser(res.data.user);
      setScreen('list');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Déconnexion Mobile (BF02)
  const handleLogout = async () => {
    try {
      await mobileApiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthToken('');
    setUser(null);
  };

  // 3. Ouvrir le détail d'un dossier (BF10, BF20)
  const openDossierDetail = async (id) => {
    setLoading(true);
    try {
      const res = await mobileApiRequest(`/dossiers/${id}`);
      setSelectedDossier(res.data);
      setScreen('detail');
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Créer un dossier et lancer optionnellement le scoring Python (BF06, BF07, BF11, BF20)
  const handleCreateDossier = async (launchScoreNow = true) => {
    if (!form.nom_demandeur.trim() || !form.prenom_demandeur.trim()) {
      showMessage('error', 'Veuillez renseigner le nom et le prénom du demandeur (BF07).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nom_demandeur: form.nom_demandeur.trim(),
        prenom_demandeur: form.prenom_demandeur.trim(),
        telephone_demandeur: form.telephone_demandeur.trim(),
        numero_piece_identite: form.numero_piece_identite.trim(),
        age: Number(form.age),
        sexe: form.sexe,
        ville: form.ville,
        activite: form.activite,
        revenu_mensuel_estime_fcfa: Number(form.revenu_mensuel_estime_fcfa),
        anciennete_mobile_money_mois: Number(form.anciennete_mobile_money_mois),
        volume_mm_mensuel_fcfa: Number(form.volume_mm_mensuel_fcfa),
        factures_cie_sodeci_payees_pct: Number(form.factures_cie_sodeci_payees_pct),
        nb_credits_anterieurs: Number(form.nb_credits_anterieurs),
        montant_demande_fcfa: Number(form.montant_demande_fcfa),
        duree_mois: Number(form.duree_mois),
        observations_agent: form.observations_agent.trim(),
      };

      const createRes = await mobileApiRequest('/dossiers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const created = createRes.data;
      setForm(INITIAL_FORM);

      if (launchScoreNow && created?.id) {
        setScoringInProgress(true);
        const scoreRes = await mobileApiRequest(`/dossiers/${created.id}/score`, {
          method: 'POST',
        });
        showMessage(
          'success',
          `Dossier ${created.reference} évalué : Score ${scoreRes.data.score}/1000 (${scoreRes.data.niveau_risque})`
        );
      } else {
        showMessage('success', `Dossier ${created.reference} enregistré avec succès.`);
      }

      await openDossierDetail(created.id);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setScoringInProgress(false);
      setLoading(false);
    }
  };

  // 5. Lancer le scoring Python sur le dossier affiché (BF11, BF13, BF19, BF20)
  const handleRunScoring = async (dossierId) => {
    setScoringInProgress(true);
    try {
      const res = await mobileApiRequest(`/dossiers/${dossierId}/score`, {
        method: 'POST',
      });
      showMessage(
        'success',
        `Score calculé : ${res.data.score}/1000 — Risque ${res.data.niveau_risque} (${res.data.probabilite_defaut_pct}%)`
      );
      await openDossierDetail(dossierId);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setScoringInProgress(false);
    }
  };

  // ============================================================================
  // ÉCRAN 1 : CONNEXION MOBILE (BF01, BF20)
  // ============================================================================
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.brandBanner}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>UIYA</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>FinScore Mobile</Text>
              <Text style={styles.brandSub}>
                Application Terrain • Scoring de Crédit Microfinance (BF20)
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Connexion Agent de Crédit</Text>
            <Text style={styles.sectionSub}>
              Accédez à vos dossiers de crédit et lancez le modèle Python depuis votre téléphone.
            </Text>

            {feedback && (
              <View
                style={[
                  styles.alertBox,
                  feedback.type === 'error' ? styles.alertError : styles.alertSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.alertText,
                    feedback.type === 'error' ? styles.alertErrorText : styles.alertSuccessText,
                  ]}
                >
                  {feedback.text}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Identifiant ou E-mail</Text>
            <TextInput
              style={styles.input}
              value={identifiant}
              onChangeText={setIdentifiant}
              autoCapitalize="none"
              placeholder="Ex: agent.grace"
            />

            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Text style={styles.inputLabel}>URL API Backend Laravel (Wi-Fi / Local)</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              placeholder="http://127.0.0.1:8000/api"
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Se connecter à l'application</Text>
              )}
            </TouchableOpacity>

            <View style={styles.quickDemoBox}>
              <Text style={styles.quickDemoTitle}>COMPTES DE DÉMONSTRATION (1-TAP)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => {
                    setIdentifiant('agent.grace');
                    setPassword('Agent@2026');
                  }}
                >
                  <Text style={styles.demoChipText}>Agent Grâce</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={() => {
                    setIdentifiant('admin');
                    setPassword('Admin@2026');
                  }}
                >
                  <Text style={styles.demoChipText}>Admin UIYA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.demoChip, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
                  onPress={() => {
                    setIdentifiant('agent.inactif');
                    setPassword('Agent@2026');
                  }}
                >
                  <Text style={[styles.demoChipText, { color: '#DC2626' }]}>
                    Compte Bloqué (BF01)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const mensualiteApercu = Math.round(
    Number(form.montant_demande_fcfa || 0) / Math.max(Number(form.duree_mois || 1), 1)
  );
  const tauxEffortApercu = (
    (mensualiteApercu / Math.max(Number(form.revenu_mensuel_estime_fcfa || 1), 1)) *
    100
  ).toFixed(1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* En-tête supérieur Mobile */}
      <View style={styles.mobileHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.logoBadgeSmall}>
            <Text style={styles.logoBadgeSmallText}>UIYA</Text>
          </View>
          <View>
            <Text style={styles.headerAppTitle}>FinScore Mobile</Text>
            <Text style={styles.headerUserSub}>
              {user.nom_complet} ({user.role.toUpperCase()})
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Barre d'onglets inférieure / supérieure ergonomique (BNF11) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, screen === 'list' && styles.tabButtonActive]}
          onPress={() => setScreen('list')}
        >
          <Text style={[styles.tabButtonText, screen === 'list' && styles.tabButtonTextActive]}>
            Dossiers ({dossiers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, screen === 'create' && styles.tabButtonActive]}
          onPress={() => setScreen('create')}
        >
          <Text style={[styles.tabButtonText, screen === 'create' && styles.tabButtonTextActive]}>
            + Nouveau Dossier
          </Text>
        </TouchableOpacity>

        {selectedDossier && (
          <TouchableOpacity
            style={[styles.tabButton, screen === 'detail' && styles.tabButtonActive]}
            onPress={() => setScreen('detail')}
          >
            <Text style={[styles.tabButtonText, screen === 'detail' && styles.tabButtonTextActive]}>
              Résultat Scoring
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {feedback && (
          <View
            style={[
              styles.alertBox,
              feedback.type === 'error' ? styles.alertError : styles.alertSuccess,
            ]}
          >
            <Text
              style={[
                styles.alertText,
                feedback.type === 'error' ? styles.alertErrorText : styles.alertSuccessText,
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        )}

        {/* ======================================================================
            ÉCRAN 2 : LISTE & RECHERCHE DES DOSSIERS (BF09, BF17, BF20)
            ====================================================================== */}
        {screen === 'list' && (
          <View>
            {/* Résumé KPI Mobile */}
            {dashboard && (
              <View style={styles.kpiRow}>
                <View style={styles.kpiMiniCard}>
                  <Text style={styles.kpiMiniLabel}>Total</Text>
                  <Text style={styles.kpiMiniValue}>{dashboard.total_dossiers}</Text>
                </View>
                <View style={styles.kpiMiniCard}>
                  <Text style={styles.kpiMiniLabel}>En attente</Text>
                  <Text style={[styles.kpiMiniValue, { color: '#D97706' }]}>
                    {dashboard.dossiers_en_cours}
                  </Text>
                </View>
                <View style={styles.kpiMiniCard}>
                  <Text style={styles.kpiMiniLabel}>Évalués</Text>
                  <Text style={[styles.kpiMiniValue, { color: '#059669' }]}>
                    {dashboard.evaluations_realisees}
                  </Text>
                </View>
                <View style={styles.kpiMiniCard}>
                  <Text style={styles.kpiMiniLabel}>Score Moy.</Text>
                  <Text style={[styles.kpiMiniValue, { color: '#1E3A8A' }]}>
                    {dashboard.score_moyen_sur_1000}
                  </Text>
                </View>
              </View>
            )}

            {/* Recherche & Filtres rapides (BF09) */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Rechercher réf (DOS-...) ou nom..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={loadMobileData}>
                  <Text style={styles.searchBtnText}>Filtrer</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
              >
                <View style={styles.chipRow}>
                  {[
                    { key: '', label: 'Tous' },
                    { key: 'en_cours', label: 'En attente' },
                    { key: 'Faible', label: 'Risque Faible' },
                    { key: 'Moyen', label: 'Risque Moyen' },
                    { key: 'Élevé', label: 'Risque Élevé' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[
                        styles.filterChip,
                        riskFilter === f.key && styles.filterChipActive,
                      ]}
                      onPress={() => setRiskFilter(f.key)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          riskFilter === f.key && styles.filterChipTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Cartes des dossiers */}
            {dossiers.map((d) => {
              const ev = d.derniere_evaluation;
              const colors = getRiskColors(ev?.niveau_risque);
              return (
                <TouchableOpacity
                  key={d.id}
                  style={styles.dossierCard}
                  onPress={() => openDossierDetail(d.id)}
                >
                  <View style={styles.dossierCardHeader}>
                    <Text style={styles.dossierRef}>{d.reference}</Text>
                    <View
                      style={[
                        styles.riskBadge,
                        { backgroundColor: colors.bg, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.riskBadgeText, { color: colors.text }]}>
                        {ev ? `${ev.score}/1000 • ${colors.label}` : colors.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.dossierClientName}>
                    {d.nom_demandeur} {d.prenom_demandeur}
                  </Text>
                  <Text style={styles.dossierMeta}>
                    {d.age} ans • {d.ville} • {d.activite.toUpperCase()}
                  </Text>

                  <View style={styles.dossierFooter}>
                    <View>
                      <Text style={styles.dossierAmountLabel}>Montant demandé</Text>
                      <Text style={styles.dossierAmountValue}>
                        {formatFcfaMobile(d.montant_demande_fcfa)} ({d.duree_mois} mois)
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={ev ? styles.outlineBtnSmall : styles.primaryBtnSmall}
                      onPress={() => openDossierDetail(d.id)}
                    >
                      <Text style={ev ? styles.outlineBtnSmallText : styles.primaryBtnSmallText}>
                        {ev ? 'Voir Résultat' : 'Scorer (BF11)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ======================================================================
            ÉCRAN 3 : CRÉATION D'UN DOSSIER SUR TÉLÉPHONE (BF06, BF07, BF20, BNF11)
            ====================================================================== */}
        {screen === 'create' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1. Identité & Activité du Demandeur</Text>

              <Text style={styles.inputLabel}>Nom du demandeur *</Text>
              <TextInput
                style={styles.input}
                value={form.nom_demandeur}
                onChangeText={(v) => setForm({ ...form, nom_demandeur: v })}
                placeholder="Ex: Koné"
              />

              <Text style={styles.inputLabel}>Prénom(s) *</Text>
              <TextInput
                style={styles.input}
                value={form.prenom_demandeur}
                onChangeText={(v) => setForm({ ...form, prenom_demandeur: v })}
                placeholder="Ex: Mariam"
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Âge (18-100) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={form.age}
                    onChangeText={(v) => setForm({ ...form, age: v })}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Sexe *</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {['F', 'M'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.choiceBtn,
                          form.sexe === s && styles.choiceBtnActive,
                        ]}
                        onPress={() => setForm({ ...form, sexe: s })}
                      >
                        <Text
                          style={[
                            styles.choiceBtnText,
                            form.sexe === s && styles.choiceBtnTextActive,
                          ]}
                        >
                          {s === 'F' ? 'Femme (F)' : 'Homme (M)'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Ville (Choisir ou saisir une autre ville) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={styles.chipRow}>
                  {VILLES.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.filterChip, form.ville === v && styles.filterChipActive]}
                      onPress={() => setForm({ ...form, ville: v })}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          form.ville === v && styles.filterChipTextActive,
                        ]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                style={styles.input}
                value={form.ville}
                onChangeText={(v) => setForm({ ...form, ville: v })}
                placeholder="Ou saisissez une autre ville (ex: Bondoukou, Soubré)..."
              />

              <Text style={styles.inputLabel}>Secteur d'activité (Choisir ou saisir) *</Text>
              <View style={styles.chipWrap}>
                {ACTIVITES.map((a) => (
                  <TouchableOpacity
                    key={a.value}
                    style={[
                      styles.filterChip,
                      form.activite === a.value && styles.filterChipActive,
                    ]}
                    onPress={() => setForm({ ...form, activite: a.value })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        form.activite === a.value && styles.filterChipTextActive,
                      ]}
                    >
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={form.activite}
                onChangeText={(v) => setForm({ ...form, activite: v })}
                placeholder="Ou saisissez une autre activité (ex: élevage, coiffure)..."
              />
            </View>

            {/* Section 2 : Données Alternatives */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2. Revenus & Données Alternatives</Text>

              <Text style={styles.inputLabel}>Revenu mensuel estimé (FCFA) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.revenu_mensuel_estime_fcfa}
                onChangeText={(v) => setForm({ ...form, revenu_mensuel_estime_fcfa: v })}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Ancienneté Mobile Money (mois)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={form.anciennete_mobile_money_mois}
                    onChangeText={(v) => setForm({ ...form, anciennete_mobile_money_mois: v })}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Volume MM / mois (FCFA)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={form.volume_mm_mensuel_fcfa}
                    onChangeText={(v) => setForm({ ...form, volume_mm_mensuel_fcfa: v })}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>
                Factures CIE / SODECI payées à temps ({Math.round(Number(form.factures_cie_sodeci_payees_pct) * 100)}%)
              </Text>
              <View style={styles.chipRow}>
                {['0.45', '0.65', '0.75', '0.85', '0.95'].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.filterChip,
                      form.factures_cie_sodeci_payees_pct === val && styles.filterChipActive,
                    ]}
                    onPress={() => setForm({ ...form, factures_cie_sodeci_payees_pct: val })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        form.factures_cie_sodeci_payees_pct === val && styles.filterChipTextActive,
                      ]}
                    >
                      {Math.round(Number(val) * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Section 3 : Demande de prêt */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3. Montant & Durée du Crédit</Text>

              <Text style={styles.inputLabel}>Montant demandé (FCFA) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.montant_demande_fcfa}
                onChangeText={(v) => setForm({ ...form, montant_demande_fcfa: v })}
              />

              <Text style={styles.inputLabel}>Durée de remboursement (en mois) *</Text>
              <View style={styles.chipRow}>
                {['3', '6', '9', '12', '18', '24'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.filterChip, form.duree_mois === m && styles.filterChipActive]}
                    onPress={() => setForm({ ...form, duree_mois: m })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        form.duree_mois === m && styles.filterChipTextActive,
                      ]}
                    >
                      {m} mois
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.ratioPreviewBox}>
                <Text style={styles.ratioPreviewTitle}>
                  Mensualité estimée : {formatFcfaMobile(mensualiteApercu)} / mois
                </Text>
                <Text style={styles.ratioPreviewSub}>
                  Taux d'effort mensuel : {tauxEffortApercu} % du revenu
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => handleCreateDossier(true)}
                disabled={loading || scoringInProgress}
              >
                {loading || scoringInProgress ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    Enregistrer et Lancer le Scoring Python
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================================
            ÉCRAN 4 : DÉTAIL DU DOSSIER & RÉSULTAT DU SCORING (BF10, BF11, BF13, BF20)
            ====================================================================== */}
        {screen === 'detail' && selectedDossier && (
          <View>
            <View style={styles.card}>
              <View style={styles.dossierCardHeader}>
                <Text style={styles.dossierRef}>{selectedDossier.reference}</Text>
                <TouchableOpacity onPress={() => setScreen('list')}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#2563EB' }}>
                    ← Retour liste
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dossierClientName}>
                {selectedDossier.nom_demandeur} {selectedDossier.prenom_demandeur}
              </Text>
              <Text style={styles.dossierMeta}>
                {selectedDossier.age} ans • {selectedDossier.ville} •{' '}
                {selectedDossier.activite.toUpperCase()}
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 12 }]}
                onPress={() => handleRunScoring(selectedDossier.id)}
                disabled={scoringInProgress}
              >
                {scoringInProgress ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {selectedDossier.derniere_evaluation
                      ? 'Relancer le Scoring Python (BF11)'
                      : 'Lancer le Scoring Python (BF11)'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Carte de résultat Jauge sur 1000 */}
            <MobileScoreCard evaluation={selectedDossier.derniere_evaluation} />

            {/* Fiche récapitulative des 11 variables du dossier */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Variables Transmises au Modèle (BF12)</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Revenu mensuel estimé</Text>
                <Text style={styles.infoVal}>
                  {formatFcfaMobile(selectedDossier.revenu_mensuel_estime_fcfa)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Montant demandé</Text>
                <Text style={styles.infoVal}>
                  {formatFcfaMobile(selectedDossier.montant_demande_fcfa)} ({selectedDossier.duree_mois} mois)
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ancienneté Mobile Money</Text>
                <Text style={styles.infoVal}>
                  {selectedDossier.anciennete_mobile_money_mois} mois
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Volume Mobile Money / mois</Text>
                <Text style={styles.infoVal}>
                  {formatFcfaMobile(selectedDossier.volume_mm_mensuel_fcfa)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Factures CIE/SODECI payées</Text>
                <Text style={styles.infoVal}>
                  {Math.round(Number(selectedDossier.factures_cie_sodeci_payees_pct) * 100)} %
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Crédits antérieurs</Text>
                <Text style={styles.infoVal}>{selectedDossier.nb_credits_anterieurs}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loginContainer: {
    padding: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  brandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandSub: {
    fontSize: 12.5,
    color: '#475569',
  },
  mobileHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoBadgeSmall: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeSmallText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  headerAppTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerUserSub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563EB',
  },
  tabButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 5,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickDemoBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  quickDemoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  demoChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
  },
  kpiMiniLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  kpiMiniValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  searchBtn: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  filterChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  dossierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dossierRef: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  riskBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dossierClientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dossierMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  dossierFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dossierAmountLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  dossierAmountValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  primaryBtnSmall: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnSmallText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  outlineBtnSmall: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  outlineBtnSmallText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  choiceBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  choiceBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  choiceBtnTextActive: {
    color: '#2563EB',
  },
  ratioPreviewBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
  },
  ratioPreviewTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  ratioPreviewSub: {
    fontSize: 12,
    color: '#1D4ED8',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  alertBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  alertSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertErrorText: {
    color: '#991B1B',
  },
  alertSuccessText: {
    color: '#065F46',
  },
});

