import React, { useState, useEffect, useCallback } from 'react';
import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
  clearAuthSession,
  formatFcfa,
  formatDateTime,
} from './api';
import ScoreGauge, { RiskBadge } from './components/ScoreGauge';

const VILLES = [
  'Abengourou', 'Abidjan', 'Bouaké', 'Daloa', 'Divo',
  'Gagnoa', 'Korhogo', 'Man', 'San-Pédro', 'Yamoussoukro',
];

const ACTIVITES = [
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'artisanat', label: 'Artisanat' },
  { value: 'commerce', label: 'Commerce' },
  { value: 'couture', label: 'Couture' },
  { value: 'restauration', label: 'Restauration' },
  { value: 'salarie', label: 'Salarié(e)' },
  { value: 'transport', label: 'Transport' },
];

const INITIAL_DOSSIER_FORM = {
  nom_demandeur: '',
  prenom_demandeur: '',
  telephone_demandeur: '+225 07 ',
  numero_piece_identite: 'CI-',
  age: 34,
  sexe: 'F',
  ville: 'Yamoussoukro',
  activite: 'commerce',
  revenu_mensuel_estime_fcfa: 165000,
  anciennete_mobile_money_mois: 60,
  volume_mm_mensuel_fcfa: 145000,
  factures_cie_sodeci_payees_pct: 0.82,
  nb_credits_anterieurs: 1,
  montant_demande_fcfa: 250000,
  duree_mois: 12,
  observations_agent: '',
};

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false); // Tiroir 3D Drawer IntelImprim
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false); // Popup menu profil

  // Notifications
  const [bannerMsg, setBannerMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scoringLoadingId, setScoringLoadingId] = useState(null);

  // Données
  const [dashboard, setDashboard] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [rapportData, setRapportData] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [modelSettings, setModelSettings] = useState(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterVille, setFilterVille] = useState('');
  const [filterRisque, setFilterRisque] = useState('');

  // Formulaire Dossier
  const [editingDossierId, setEditingDossierId] = useState(null);
  const [dossierForm, setDossierForm] = useState(INITIAL_DOSSIER_FORM);
  const [customVilleMode, setCustomVilleMode] = useState(false);
  const [customActiviteMode, setCustomActiviteMode] = useState(false);

  // Connexion
  const [loginIdentifiant, setLoginIdentifiant] = useState('agent.grace');
  const [loginPassword, setLoginPassword] = useState('Agent@2026');
  const [loginError, setLoginError] = useState('');

  // Admin New User
  const [newUserForm, setNewUserForm] = useState({
    nom_complet: '',
    identifiant: '',
    email: '',
    telephone: '+225 07 ',
    password: '',
    role: 'agent',
  });

  // Changement Mot de Passe
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  const notify = (type, text) => {
    setBannerMsg({ type, text });
    setTimeout(() => {
      setBannerMsg((prev) => (prev?.text === text ? null : prev));
    }, 6000);
  };

  // Fermer le tiroir 3D au clavier (Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Chargements API
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/dashboard');
      setDashboard(res.data);
    } catch (err) {
      if (err.status === 401) setUser(null);
      else notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDossiers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (filterStatut) params.set('statut', filterStatut);
      if (filterVille) params.set('ville', filterVille);
      if (filterRisque) params.set('niveau_risque', filterRisque);

      const res = await apiRequest(`/dossiers?${params.toString()}`);
      setDossiers(res.data || []);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatut, filterVille, filterRisque]);

  const loadEvaluations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/evaluations');
      setEvaluations(res.data || []);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/users');
      setUsersList(res.data || []);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModelSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/referentiels');
      setModelSettings(res.data);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !getStoredToken()) return;
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'dossiers') loadDossiers();
    if (activeTab === 'historique') loadEvaluations();
    if (activeTab === 'users' && user.role === 'admin') loadUsers();
    if (activeTab === 'profil' || activeTab === 'modele-ia') {
      loadModelSettings();
      loadDashboard();
    }
  }, [user, activeTab, loadDashboard, loadDossiers, loadEvaluations, loadUsers, loadModelSettings]);

  // Auth Handlers
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifiant: loginIdentifiant,
          password: loginPassword,
          device_name: 'Interface Web React',
        }),
      });
      saveAuthSession(res.data.token, res.data.user);
      setUser(res.data.user);
      setActiveTab('dashboard');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearAuthSession();
    setUser(null);
    setMenuOpen(false);
  };

  const openDossierDetail = async (id) => {
    try {
      setLoading(true);
      const res = await apiRequest(`/dossiers/${id}`);
      setSelectedDossier(res.data);
      setActiveTab('dossier-detail');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditDossier = (dossier) => {
    setEditingDossierId(dossier.id);
    setDossierForm({
      nom_demandeur: dossier.nom_demandeur || '',
      prenom_demandeur: dossier.prenom_demandeur || '',
      telephone_demandeur: dossier.telephone_demandeur || '',
      numero_piece_identite: dossier.numero_piece_identite || '',
      age: dossier.age,
      sexe: dossier.sexe,
      ville: dossier.ville,
      activite: dossier.activite,
      revenu_mensuel_estime_fcfa: dossier.revenu_mensuel_estime_fcfa,
      anciennete_mobile_money_mois: dossier.anciennete_mobile_money_mois,
      volume_mm_mensuel_fcfa: dossier.volume_mm_mensuel_fcfa,
      factures_cie_sodeci_payees_pct: dossier.factures_cie_sodeci_payees_pct,
      nb_credits_anterieurs: dossier.nb_credits_anterieurs,
      montant_demande_fcfa: dossier.montant_demande_fcfa,
      duree_mois: dossier.duree_mois,
      observations_agent: dossier.observations_agent || '',
    });
    setActiveTab('nouveau-dossier');
  };

  const handleSaveDossier = async (e, launchScoringRightAway = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...dossierForm,
        age: Number(dossierForm.age),
        revenu_mensuel_estime_fcfa: Number(dossierForm.revenu_mensuel_estime_fcfa),
        anciennete_mobile_money_mois: Number(dossierForm.anciennete_mobile_money_mois),
        volume_mm_mensuel_fcfa: Number(dossierForm.volume_mm_mensuel_fcfa),
        factures_cie_sodeci_payees_pct: Number(dossierForm.factures_cie_sodeci_payees_pct),
        nb_credits_anterieurs: Number(dossierForm.nb_credits_anterieurs),
        montant_demande_fcfa: Number(dossierForm.montant_demande_fcfa),
        duree_mois: Number(dossierForm.duree_mois),
      };

      let savedDossier;
      if (editingDossierId) {
        const res = await apiRequest(`/dossiers/${editingDossierId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        savedDossier = res.data;
        notify('success', res.message);
      } else {
        const res = await apiRequest('/dossiers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        savedDossier = res.data;
        notify('success', res.message);
      }

      setEditingDossierId(null);
      setDossierForm(INITIAL_DOSSIER_FORM);

      if (launchScoringRightAway && savedDossier?.id) {
        await apiRequest(`/dossiers/${savedDossier.id}/score`, { method: 'POST' });
        notify('success', `Dossier ${savedDossier.reference} enregistré et évalué par le modèle Python !`);
      }

      await openDossierDetail(savedDossier.id);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLancerScoring = async (dossierId) => {
    setLoading(true);
    setScoringLoadingId(dossierId);
    try {
      const res = await apiRequest(`/dossiers/${dossierId}/score`, { method: 'POST' });
      notify(
        'success',
        `Scoring terminé : Score ${res.data.score}/1000 — Risque ${res.data.niveau_risque} (${res.data.probabilite_defaut_pct}%).`
      );
      await openDossierDetail(dossierId);
    } catch (err) {
      notify('error', err.message);
    } finally {
      setScoringLoadingId(null);
      setLoading(false);
    }
  };

  const handleOpenRapport = async (dossierId) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/dossiers/${dossierId}/rapport`);
      setRapportData(res.data);
      setActiveTab('rapport');
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm),
      });
      notify('success', res.message);
      setNewUserForm({
        nom_complet: '',
        identifiant: '',
        email: '',
        telephone: '+225 07 ',
        password: '',
        role: 'agent',
      });
      loadUsers();
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserActive = async (id) => {
    try {
      const res = await apiRequest(`/users/${id}/toggle-active`, { method: 'PATCH' });
      notify('success', res.message);
      loadUsers();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleDeleteUser = async (id, nom) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de "${nom}" ?`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await apiRequest(`/users/${id}`, { method: 'DELETE' });
      notify('success', res.message);
      loadUsers();
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(pwdForm),
      });
      notify('success', res.message);
      setPwdForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err) {
      notify('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // 1. PAGE DE CONNEXION (LAYOUT GUEST CINÉMATIQUE IDENTIQUE À INTELIMPRIM)
  // ============================================================================
  if (!user) {
    return (
      <div className="login-cinematic-wrapper min-h-full flex flex-col lg:flex-row bg-[#FAF8F5] text-slate-800 h-screen overflow-y-auto">
        {/* ================= PANNEAU VISUEL CINÉMATIQUE GAUCHE ================= */}
        <div className="login-cinematic-left relative lg:w-5/12 xl:w-5/12 min-h-[380px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 text-white overflow-hidden shrink-0">
          {/* Image d'ambiance bancaire vivante et lumineuse */}
          <img
            src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2400&auto=format&fit=crop"
            alt="Établissement Bancaire & Microfinance"
            className="login-cinematic-bg-img absolute inset-0 w-full h-full object-cover object-center filter brightness-95 contrast-105"
          />

          {/* Voile léger laissant l'image éclatante et vivante */}
          <div className="login-cinematic-overlay absolute inset-0"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.18),_transparent_60%)] pointer-events-none z-[3]"></div>

          {/* Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/95 text-[#B45309] flex items-center justify-center font-black shadow-lg shadow-black/20 backdrop-blur-sm">
                <i className="fas fa-chart-line text-xl"></i>
              </div>
              <div>
                <span className="block font-black text-xl uppercase tracking-tight text-white drop-shadow-xs font-display">
                  FIN<span className="text-amber-300">.SCORE</span>
                </span>
                <span className="text-[10px] font-bold uppercase text-white/80 tracking-widest block -mt-0.5">
                  Université Internationale de Yamoussoukro &bull; UIYA
                </span>
              </div>
            </div>
          </div>

          {/* Message Punchy & Titre */}
          <div className="relative z-10 my-8 lg:my-auto space-y-6 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Scoring Machine Learning & Données Alternatives</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-sm font-display">
              L'intelligence artificielle au service de la microfinance.
            </h1>

            <p className="text-xs sm:text-sm text-amber-100/90 font-normal leading-relaxed">
              Évaluez la solvabilité des entrepreneurs et particuliers sans historique bancaire grâce
              aux flux <strong>Mobile Money</strong>, factures <strong>CIE/SODECI</strong> et à notre
              modèle Python entraîné sur 6 000 dossiers ivoiriens.
            </p>

            {/* Mini Cartouche Flottant Chic */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-2">
                  <i className="fas fa-bolt text-amber-300"></i> Traitement instantané
                </span>
                <span className="text-emerald-300 font-extrabold font-mono">&sim; 150 ms / dossier</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-amber-100/80">
                <i className="fas fa-check-circle text-emerald-400 text-xs"></i>
                <span>Score de crédit transparent sur 1 000 points & probabilité de défaut</span>
              </div>
            </div>
          </div>

          {/* Footer Gauche Minimaliste */}
          <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-[11px] text-amber-300">
            <span>&copy; 2026 FinScore UIYA</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-white/90">
              <i className="fas fa-shield-halved text-emerald-300"></i>
              Données financières sécurisées
            </span>
          </div>
        </div>

        {/* ================= PANNEAU FORMULAIRE DROIT ================= */}
        <div className="login-cinematic-right lg:w-7/12 xl:w-7/12 flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto bg-white">
          <div className="flex justify-end mb-4">
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200">
              <i className="fas fa-graduation-cap text-[#B45309]"></i>
              <span>Licence 3 Informatique &bull; Génie Logiciel</span>
            </span>
          </div>

          <div className="max-w-lg w-full mx-auto my-auto py-4">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-100 mb-3">
                <i className="fas fa-lock text-[10px]"></i> Espace d'Authentification Sécurisé
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                Connexion à votre espace
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Saisissez votre identifiant pour accéder au tableau de bord et au moteur de scoring.
              </p>
            </div>

            {loginError && (
              <div className="p-4 mb-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3">
                <i className="fas fa-circle-exclamation text-rose-600 text-sm shrink-0"></i>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Identifiant ou E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fas fa-user text-xs"></i>
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifiant}
                    onChange={(e) => setLoginIdentifiant(e.target.value)}
                    placeholder="agent.grace ou admin"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fas fa-lock text-xs"></i>
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20 transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>Authentification...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right-to-bracket"></i>
                    <span>Se connecter à la plateforme</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Plateforme certifiée UIYA pour les institutions de microfinance en Côte d'Ivoire.
          </div>
        </div>
      </div>
    );
  }

  // Calculs Ratios en temps réel
  const formMensualite = Math.round(
    Number(dossierForm.montant_demande_fcfa || 0) / Math.max(Number(dossierForm.duree_mois || 1), 1)
  );
  const formTauxEffortPct = (
    (formMensualite / Math.max(Number(dossierForm.revenu_mensuel_estime_fcfa || 1), 1)) *
    100
  ).toFixed(1);

  // ============================================================================
  // 2. INTERFACE APPLICATION AVEC TIROIR 3D DRAWER & FOND BANCAIRE VIVANT
  // ============================================================================
  return (
    <div className="h-screen w-screen overflow-hidden relative flex select-none bg-stone-900">
      {/* 1. L'image de banque prend 100% de toute la surface, de bord à bord */}
      <img
        src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2400&auto=format&fit=crop"
        alt="Agence Bancaire & Microfinance"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none filter brightness-105 contrast-100"
      />
      {/* Léger filtre doux pour une parfaite lisibilité sans masquer l'image */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>

      {/* ========================================================================
          SIDEBAR FLOTTANTE EN VERRE SUR L'IMAGE
          ======================================================================== */}
      <aside className="m-3 sm:m-4 w-[265px] sm:w-[280px] h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] z-10 flex flex-col justify-between py-5 px-4 text-white bg-stone-950/40 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shrink-0 overflow-y-auto">
        <div>
          {/* Header Brand Aside */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[#B45309] flex items-center justify-center font-black shadow-sm text-sm">
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <span className="font-black text-sm uppercase tracking-tight text-white block font-display">
                  FIN<span className="text-amber-300">.SCORE</span>
                </span>
                <span className="text-[9px] font-black uppercase text-white/70 tracking-wider block -mt-0.5">
                  UIYA &bull; Microfinance
                </span>
              </div>
            </div>

            {/* Bouton fermeture tiroir */}
            <button
              onClick={() => setMenuOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              title="Fermer le menu"
            >
              <i className="fas fa-xmark text-xs"></i>
            </button>
          </div>

          {/* Navigation Métier */}
          <div className="space-y-1">
            <div className="px-3 py-1.5 text-[9px] font-black uppercase text-white/60 tracking-widest">
              Espace Métier
            </div>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMenuOpen(false);
              }}
              className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#B45309] shadow-sm'
                  : 'text-white/85 hover:bg-white/10 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fas fa-chart-pie text-xs w-4 text-center"></i>
                <span>Tableau de Bord</span>
              </div>
              {activeTab === 'dashboard' && <i className="fas fa-chevron-right text-[10px]"></i>}
            </button>

            <button
              onClick={() => {
                setEditingDossierId(null);
                setDossierForm(INITIAL_DOSSIER_FORM);
                setActiveTab('nouveau-dossier');
                setMenuOpen(false);
              }}
              className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'nouveau-dossier'
                  ? 'bg-white text-[#B45309] shadow-sm'
                  : 'text-white/85 hover:bg-white/10 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fas fa-folder-plus text-xs w-4 text-center"></i>
                <span>Nouveau Dossier</span>
              </div>
              {activeTab === 'nouveau-dossier' && <i className="fas fa-chevron-right text-[10px]"></i>}
            </button>

            <button
              onClick={() => {
                setActiveTab('dossiers');
                setMenuOpen(false);
              }}
              className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dossiers' || activeTab === 'dossier-detail' || activeTab === 'rapport'
                  ? 'bg-white text-[#B45309] shadow-sm'
                  : 'text-white/85 hover:bg-white/10 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fas fa-folder-open text-xs w-4 text-center"></i>
                <span>Liste des Dossiers</span>
              </div>
              {(activeTab === 'dossiers' || activeTab === 'dossier-detail' || activeTab === 'rapport') && (
                <i className="fas fa-chevron-right text-[10px]"></i>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('historique');
                setMenuOpen(false);
              }}
              className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'historique'
                  ? 'bg-white text-[#B45309] shadow-sm'
                  : 'text-white/85 hover:bg-white/10 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fas fa-clock-rotate-left text-xs w-4 text-center"></i>
                <span>Historique Scoring</span>
              </div>
              {activeTab === 'historique' && <i className="fas fa-chevron-right text-[10px]"></i>}
            </button>



            {/* Section Admin */}
            {user.role === 'admin' && (
              <>
                <div className="px-3 pt-3 pb-1 text-[9px] font-black uppercase text-white/60 tracking-widest">
                  Administration
                </div>

                <button
                  onClick={() => {
                    setActiveTab('users');
                    setMenuOpen(false);
                  }}
                  className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-white text-[#B45309] shadow-sm'
                      : 'text-white/85 hover:bg-white/10 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-users-gear text-xs w-4 text-center"></i>
                    <span>Gestion Utilisateurs</span>
                  </div>
                  {activeTab === 'users' && <i className="fas fa-chevron-right text-[10px]"></i>}
                </button>
              </>
            )}

            <div className="px-3 pt-3 pb-1 text-[9px] font-black uppercase text-white/60 tracking-widest">
              Compte & Paramètres
            </div>

            <button
              onClick={() => {
                setActiveTab('profil');
                setMenuOpen(false);
              }}
              className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'profil'
                  ? 'bg-white text-[#B45309] shadow-sm'
                  : 'text-white/85 hover:bg-white/10 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fas fa-circle-user text-xs w-4 text-center"></i>
                <span>Mon Profil</span>
              </div>
              {activeTab === 'profil' && <i className="fas fa-chevron-right text-[10px]"></i>}
            </button>

            <button
              onClick={() => {
                setActiveTab('modele-ia');
                setMenuOpen(false);
              }}
              className={`w-full text-[10px] uppercase tracking-wider font-extrabold flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'modele-ia'
                  ? 'bg-white text-[#B45309] shadow-sm'
                  : 'text-white/85 hover:bg-white/10 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <i className="fas fa-brain text-xs w-4 text-center"></i>
                <span>Modèle IA & Métriques</span>
              </div>
              {activeTab === 'modele-ia' && <i className="fas fa-chevron-right text-[10px]"></i>}
            </button>
          </div>
        </div>

        {/* User Footer Aside */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl bg-white text-[#B45309] hover:bg-white/90 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <i className="fas fa-power-off text-xs"></i>
            <span>Se Déconnecter</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================
          SURFACE PRINCIPALE FLOTTANTE (#app-surface)
          Glisse et rétrécit en 3D lors de l'ouverture du tiroir
          ======================================================================== */}
      <div
        id="app-surface"
        className={`absolute inset-0 z-20 bg-white flex flex-col min-w-0 h-full overflow-hidden app-surface-transition ${
          menuOpen ? 'app-surface-open' : ''
        }`}
      >
        {/* Clic direct sur la surface pour refermer la sidebar sans aucun assombrissement */}
        {menuOpen && (
          <div
            id="app-surface-overlay"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 z-30 cursor-pointer bg-transparent"
            title="Cliquer pour refermer le tiroir"
          />
        )}

        {/* Top Navbar Header (IntelImprim Style) */}
        <header className="h-16 bg-white border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            {/* Bouton Toggle Menu 3D */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center text-sm transition-all cursor-pointer border border-slate-200"
              title={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <i className={`fas ${menuOpen ? 'fa-xmark' : 'fa-bars-staggered'}`}></i>
            </button>

            <div>
              <span className="font-black text-base text-slate-900 tracking-tight font-display">
                Fin<span className="text-[#B45309]">Score</span>
              </span>
              <span className="hidden sm:inline-block ms-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-100">
                UIYA &bull; Microfinance
              </span>
            </div>
          </div>

          {/* Profil utilisateur avec Popup Menu Déroulant */}
          <div className="relative">
            {/* Bouton déclencheur utilisateur */}
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 pr-2 rounded-2xl hover:bg-slate-100/80 active:bg-slate-200/60 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
              title="Ouvrir le menu profil"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 group-hover:text-[#B45309] transition-colors leading-tight">
                  {user.nom_complet}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {user.role === 'admin' ? 'Administrateur' : 'Agent de crédit'}
                </div>
              </div>

              <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white border border-amber-200/80 flex items-center justify-center font-black text-xs transition-all shadow-xs">
                {user.nom_complet ? user.nom_complet.charAt(0).toUpperCase() : 'U'}
              </div>

              <i
                className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${
                  profileDropdownOpen ? 'rotate-180 text-[#B45309]' : ''
                }`}
              ></i>
            </button>

            {/* Popup Menu déroulant positionné juste en dessous */}
            {profileDropdownOpen && (
              <>
                {/* Voile invisible pour fermer au clic extérieur */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />

                <div className="absolute right-0 top-full mt-2.5 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* En-tête de la popup */}
                  <div className="p-3 bg-[#FAF8F5] rounded-xl border border-amber-100/60 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#B45309] text-white flex items-center justify-center font-black text-sm shadow-sm">
                        {user.nom_complet ? user.nom_complet.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {user.nom_complet}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          @{user.identifiant}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{user.role === 'admin' ? 'Administrateur' : 'Agent de crédit'} &bull; Actif</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions du menu */}
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab('profil');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#B45309] flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                        <i className="fas fa-circle-user text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#B45309]">
                          Mon Profil
                        </div>
                        <div className="text-[10px] text-slate-400">Coordonnées et informations personnelles</div>
                      </div>
                      <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-[#B45309]"></i>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('profil');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#B45309] flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                        <i className="fas fa-key text-xs"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#B45309]">
                          Changer le mot de passe
                        </div>
                        <div className="text-[10px] text-slate-400">Sécurité et identifiants d'accès</div>
                      </div>
                      <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-[#B45309]"></i>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('modele-ia');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#B45309] flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                        <i className="fas fa-brain text-xs"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#B45309]">
                          Modèle IA & Métriques
                        </div>
                        <div className="text-[10px] text-slate-400">Performance et poids des variables</div>
                      </div>
                      <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-[#B45309]"></i>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveTab('users');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors text-slate-700 hover:text-slate-900 cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#B45309] flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                          <i className="fas fa-users-gear text-xs"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-[#B45309]">
                            Gestion Utilisateurs
                          </div>
                          <div className="text-[10px] text-slate-400">Comptes agents et administrateurs</div>
                        </div>
                        <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-[#B45309]"></i>
                      </button>
                    )}
                  </div>

                  {/* Séparateur et Déconnexion */}
                  <div className="pt-2 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-rose-50 transition-colors text-rose-700 cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100/60 text-rose-600 flex items-center justify-center text-xs group-hover:scale-105 transition-transform">
                        <i className="fas fa-power-off text-xs"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-rose-700">Se Déconnecter</div>
                        <div className="text-[10px] text-rose-400">Fermer votre session de travail</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Corps de Page Scrollable */}
        <div className="flex-1 overflow-y-auto page-scroll-area p-4 sm:p-6 lg:p-8 space-y-6">
          {bannerMsg && (
            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 shadow-xs no-print ${
                bannerMsg.type === 'error'
                  ? 'bg-rose-50 border border-rose-200 text-rose-900'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 text-xs ${
                  bannerMsg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                <i className={`fas ${bannerMsg.type === 'error' ? 'fa-exclamation' : 'fa-check'}`}></i>
              </div>
              <span className="flex-1">{bannerMsg.text}</span>
            </div>
          )}

          {/* ====================================================================
              VUE 1 : TABLEAU DE BORD (BF17)
              ==================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Header Titre Page */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-100">
                      Vue Synthétique Temps Réel
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Côte d'Ivoire &bull; 2026</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2 font-display">
                    <span className="w-8 h-8 rounded-xl bg-[#B45309] text-white flex items-center justify-center text-xs font-black shadow-sm">
                      <i className="fas fa-chart-pie"></i>
                    </span>
                    Bonjour, {user.nom_complet} 👋
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Supervisez les demandes de microfinance, lancez l'estimation du risque de défaut via
                    le modèle Machine Learning et suivez les indicateurs clés.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingDossierId(null);
                      setDossierForm(INITIAL_DOSSIER_FORM);
                      setActiveTab('nouveau-dossier');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                  >
                    <i className="fas fa-plus text-xs"></i>
                    <span>+ Nouveau Dossier</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('dossiers')}
                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <i className="fas fa-folder-open text-[#B45309]"></i>
                    <span>Voir les dossiers &rarr;</span>
                  </button>
                </div>
              </div>

              {/* Guide du Workflow IntelImprim Style (Bannière Visuelle) */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                <div className="relative z-10 max-w-3xl">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-400/30 mb-3">
                    ⚡ Comment fonctionne le scoring IA en 4 étapes simples
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
                    La chaîne d'aide à la décision microfinance connectée à Python
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                      <span className="text-xs font-bold text-amber-400">1. Saisir</span>
                      <p className="text-xs text-slate-300 mt-1">
                        Enregistrez profil, activité, ancienneté & volume Mobile Money.
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                      <span className="text-xs font-bold text-amber-300">2. Ratios auto</span>
                      <p className="text-xs text-slate-300 mt-1">
                        Calcul automatique du taux d'effort et ratio crédit / revenus.
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                      <span className="text-xs font-bold text-emerald-400">3. IA Python</span>
                      <p className="text-xs text-slate-300 mt-1">
                        Le modèle calibré estime la probabilité et le score sur 1 000.
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                      <span className="text-xs font-bold text-amber-400">4. Décider & PDF</span>
                      <p className="text-xs text-slate-300 mt-1">
                        L'agent valide avec comité et imprime le rapport certifié.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grille des KPI (Identique à IntelImprim) */}
              {dashboard && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* KPI 1 : Total Dossiers */}
                    <div
                      onClick={() => setActiveTab('dossiers')}
                      className="premium-card p-5 space-y-2 hover:border-[#B45309]/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-[#B45309] transition-colors">
                          Total Dossiers
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all flex items-center justify-center text-xs">
                          <i className="fas fa-folder-closed"></i>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-900 font-display">
                        {dashboard.total_dossiers}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Enregistrés dans MySQL</p>
                    </div>

                    {/* KPI 2 : En attente */}
                    <div className="premium-card p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Dossiers en Attente
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                          <i className="fas fa-hourglass-half"></i>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-amber-600 font-display">
                        {dashboard.dossiers_en_cours}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">À évaluer par l'IA</p>
                    </div>

                    {/* KPI 3 : Évaluations IA */}
                    <div
                      onClick={() => setActiveTab('historique')}
                      className="premium-card p-5 space-y-2 hover:border-[#B45309]/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-[#B45309] transition-colors">
                          Évaluations IA
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center justify-center text-xs">
                          <i className="fas fa-brain"></i>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-emerald-600 font-display">
                        {dashboard.evaluations_realisees}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Modèle Python v1.0.0</p>
                    </div>

                    {/* KPI 4 : Score Moyen */}
                    <div className="premium-card p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Score Moyen Observé
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xs">
                          <i className="fas fa-gauge-high"></i>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-amber-800 font-mono">
                        {dashboard.score_moyen_sur_1000} <span className="text-sm font-semibold text-slate-400">/ 1000</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        Volume : {formatFcfa(dashboard.montant_total_demande_fcfa)}
                      </p>
                    </div>
                  </div>

                  {/* Répartition Risques & Secteurs d'Activité */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Répartition Niveaux de Risque */}
                    <div className="premium-card p-6 space-y-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Répartition des Niveaux de Risque (BF17)
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Distribution des dossiers scorés selon le seuil de risque prédit.
                        </p>
                      </div>

                      {(() => {
                        const totalEval = Math.max(dashboard.evaluations_realisees || 1, 1);
                        const faible = dashboard.repartition_niveaux_risque?.Faible || 0;
                        const moyen = dashboard.repartition_niveaux_risque?.Moyen || 0;
                        const eleve = dashboard.repartition_niveaux_risque?.['Élevé'] || 0;

                        return (
                          <div className="space-y-3.5 pt-2">
                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-emerald-700 flex items-center gap-1.5">
                                  <i className="fas fa-circle-check text-emerald-500"></i> Risque Faible (Score &gt; 700)
                                </span>
                                <span className="font-mono text-slate-800">{faible} dossier(s)</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${(faible / totalEval) * 100}%` }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-amber-700 flex items-center gap-1.5">
                                  <i className="fas fa-triangle-exclamation text-amber-500"></i> Risque Moyen (400 &lt; Score ≤ 700)
                                </span>
                                <span className="font-mono text-slate-800">{moyen} dossier(s)</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 rounded-full transition-all"
                                  style={{ width: `${(moyen / totalEval) * 100}%` }}
                                ></div>
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-rose-700 flex items-center gap-1.5">
                                  <i className="fas fa-circle-xmark text-rose-500"></i> Risque Élevé (Score ≤ 400)
                                </span>
                                <span className="font-mono text-slate-800">{eleve} dossier(s)</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full transition-all"
                                  style={{ width: `${(eleve / totalEval) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Répartition Activités */}
                    <div className="premium-card p-6 space-y-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Répartition par Secteur d'Activité
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Secteurs économiques représentés dans le portefeuille de microfinance.
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {(dashboard.repartition_par_activite || []).map((item) => {
                          const pct = Math.round(
                            (item.total / Math.max(dashboard.total_dossiers || 1, 1)) * 100
                          );
                          return (
                            <div key={item.activite} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="capitalize text-slate-700">{item.activite}</span>
                                <span className="font-mono text-slate-500 text-[11px]">
                                  {item.total} ({pct}%)
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full bg-[#B45309] rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Tableau des Dernières Évaluations */}
                  <div className="premium-card p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">
                          Dernières Évaluations de Scoring Réalisées
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Consultez la jauge de probabilité, l'explication et éditez les rapports imprimables.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('historique')}
                        className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Voir tout l'historique</span>
                        <i className="fas fa-arrow-right text-[10px]"></i>
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="custom-table min-w-[1050px]">
                        <thead>
                          <tr>
                            <th>RÉFÉRENCE</th>
                            <th>DEMANDEUR</th>
                            <th>VILLE</th>
                            <th>ACTIVITÉ</th>
                            <th>MONTANT DEMANDÉ</th>
                            <th>SCORE (/1000)</th>
                            <th>NIVEAU RISQUE</th>
                            <th>DATE & HEURE</th>
                            <th className="text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {(dashboard.dernieres_evaluations || []).map((ev) => (
                            <tr key={ev.id}>
                              <td className="font-mono font-bold text-xs text-[#B45309]">
                                <span className="bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/60 inline-block">
                                  {ev.dossier?.reference}
                                </span>
                              </td>
                              <td className="font-bold text-xs text-slate-900">
                                {ev.dossier?.nom_demandeur} {ev.dossier?.prenom_demandeur}
                              </td>
                              <td className="capitalize text-xs text-slate-700">
                                {ev.dossier?.ville}
                              </td>
                              <td className="capitalize text-xs text-slate-500">
                                {ev.dossier?.activite}
                              </td>
                              <td className="font-mono text-xs font-bold text-slate-900">
                                {formatFcfa(ev.dossier?.montant_demande_fcfa)}
                              </td>
                              <td className="font-mono text-xs font-extrabold text-slate-900">
                                {ev.score} <span className="text-slate-400 font-normal">/ 1000</span>
                              </td>
                              <td>
                                <RiskBadge niveau={ev.niveau_risque} />
                              </td>
                              <td className="text-[11px] font-mono text-slate-500">
                                {formatDateTime(ev.created_at)}
                              </td>
                              <td className="text-right">
                                <button
                                  onClick={() => openDossierDetail(ev.dossier_id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-[#B45309] text-[#B45309] hover:text-white border border-amber-200/80 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                >
                                  <span>Détail</span>
                                  <i className="fas fa-chevron-right text-[10px]"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ====================================================================
              VUE 2 : CRÉATION / MODIFICATION DOSSIER (BF06, BF08)
              ==================================================================== */}
          {activeTab === 'nouveau-dossier' && (
            <div className="premium-card p-6 sm:p-8 lg:p-10 space-y-8 w-full">
              {/* Header avec badge et boutons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-200/60">
                      {editingDossierId ? 'Modification BF08' : 'Nouveau Dossier BF06'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">Instruction de Crédit</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5 font-display">
                    {editingDossierId
                      ? 'Modifier le dossier de crédit en cours'
                      : 'Enregistrement d’un nouveau dossier de crédit'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Contrôle automatique de validité, ratios financiers calculés en temps réel et option de scoring direct.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('dossiers')}
                  className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <i className="fas fa-arrow-left"></i>
                  <span>Annuler</span>
                </button>
              </div>

              <form onSubmit={(e) => handleSaveDossier(e, false)} className="space-y-8">
                {/* SECTION 1 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center text-xs font-bold border border-amber-200/50">
                      <i className="fas fa-user"></i>
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                        1. Identité & Profil Socio-Professionnel
                      </span>
                      <span className="text-[11px] text-slate-400">Informations civiles et secteur d'activité du demandeur</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Nom *</label>
                      <input
                        type="text"
                        required
                        value={dossierForm.nom_demandeur}
                        onChange={(e) => setDossierForm({ ...dossierForm, nom_demandeur: e.target.value })}
                        className="form-input w-full"
                        placeholder="Ex: Kouassi"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Prénom(s) *</label>
                      <input
                        type="text"
                        required
                        value={dossierForm.prenom_demandeur}
                        onChange={(e) => setDossierForm({ ...dossierForm, prenom_demandeur: e.target.value })}
                        className="form-input w-full"
                        placeholder="Ex: Amenan Clarisse"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Téléphone</label>
                      <input
                        type="text"
                        value={dossierForm.telephone_demandeur}
                        onChange={(e) => setDossierForm({ ...dossierForm, telephone_demandeur: e.target.value })}
                        className="form-input w-full"
                        placeholder="+225 07..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">N° Pièce Identité (CNI)</label>
                      <input
                        type="text"
                        value={dossierForm.numero_piece_identite}
                        onChange={(e) => setDossierForm({ ...dossierForm, numero_piece_identite: e.target.value })}
                        className="form-input w-full"
                        placeholder="CI-..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Âge (18 - 100 ans) *</label>
                      <input
                        type="number"
                        min="18"
                        max="100"
                        required
                        value={dossierForm.age}
                        onChange={(e) => setDossierForm({ ...dossierForm, age: e.target.value })}
                        className="form-input font-mono w-full"
                        placeholder="35"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Sexe *</label>
                      <select
                        value={dossierForm.sexe}
                        onChange={(e) => setDossierForm({ ...dossierForm, sexe: e.target.value })}
                        className="form-select w-full"
                      >
                        <option value="F">Femme (F)</option>
                        <option value="M">Homme (M)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Ville d'activité *</label>
                      {!customVilleMode ? (
                        <select
                          value={VILLES.includes(dossierForm.ville) ? dossierForm.ville : '__custom__'}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomVilleMode(true);
                              setDossierForm({ ...dossierForm, ville: '' });
                            } else {
                              setDossierForm({ ...dossierForm, ville: e.target.value });
                            }
                          }}
                          className="form-select w-full"
                        >
                          {VILLES.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                          <option value="__custom__">+ Autre ville (Saisir manuellement)...</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Saisissez la ville..."
                            value={dossierForm.ville}
                            onChange={(e) => setDossierForm({ ...dossierForm, ville: e.target.value })}
                            className="form-input w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomVilleMode(false);
                              setDossierForm({ ...dossierForm, ville: 'Yamoussoukro' });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold cursor-pointer shrink-0"
                          >
                            Liste
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Secteur d'activité *</label>
                      {!customActiviteMode ? (
                        <select
                          value={
                            ACTIVITES.some((a) => a.value === dossierForm.activite)
                              ? dossierForm.activite
                              : '__custom__'
                          }
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomActiviteMode(true);
                              setDossierForm({ ...dossierForm, activite: '' });
                            } else {
                              setDossierForm({ ...dossierForm, activite: e.target.value });
                            }
                          }}
                          className="form-select w-full"
                        >
                          {ACTIVITES.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                          <option value="__custom__">+ Autre activité (Saisir manuellement)...</option>
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Saisissez l'activité..."
                            value={dossierForm.activite}
                            onChange={(e) => setDossierForm({ ...dossierForm, activite: e.target.value })}
                            className="form-input w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCustomActiviteMode(false);
                              setDossierForm({ ...dossierForm, activite: 'commerce' });
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold cursor-pointer shrink-0"
                          >
                            Liste
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Crédits antérieurs remboursés *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        required
                        value={dossierForm.nb_credits_anterieurs}
                        onChange={(e) => setDossierForm({ ...dossierForm, nb_credits_anterieurs: e.target.value })}
                        className="form-input font-mono w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2 */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center text-xs font-bold border border-amber-200/50">
                      <i className="fas fa-mobile-screen-button"></i>
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                        2. Revenus & Données Alternatives (Mobile Money, CIE/SODECI)
                      </span>
                      <span className="text-[11px] text-slate-400">Flux financiers réels et habitudes de paiement des factures</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Revenu mensuel estimé (FCFA) *
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        required
                        value={dossierForm.revenu_mensuel_estime_fcfa}
                        onChange={(e) => setDossierForm({ ...dossierForm, revenu_mensuel_estime_fcfa: e.target.value })}
                        className="form-input font-mono w-full"
                        placeholder="Ex: 250000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ancienneté Mobile Money (mois) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        required
                        value={dossierForm.anciennete_mobile_money_mois}
                        onChange={(e) => setDossierForm({ ...dossierForm, anciennete_mobile_money_mois: e.target.value })}
                        className="form-input font-mono w-full"
                        placeholder="Ex: 24"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Volume mensuel Mobile Money (FCFA) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={dossierForm.volume_mm_mensuel_fcfa}
                        onChange={(e) => setDossierForm({ ...dossierForm, volume_mm_mensuel_fcfa: e.target.value })}
                        className="form-input font-mono w-full"
                        placeholder="Ex: 150000"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-amber-200/70 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold">
                        <span className="text-slate-800 flex items-center gap-2">
                          <i className="fas fa-bolt text-amber-600"></i>
                          <span>Régularité du paiement des factures CIE / SODECI</span>
                        </span>
                        <span className="font-mono text-[#B45309] font-black text-sm bg-white px-3 py-1 rounded-lg border border-amber-200 self-start sm:self-auto shadow-2xs">
                          {Math.round(Number(dossierForm.factures_cie_sodeci_payees_pct) * 100)} % ({dossierForm.factures_cie_sodeci_payees_pct})
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={dossierForm.factures_cie_sodeci_payees_pct}
                        onChange={(e) =>
                          setDossierForm({ ...dossierForm, factures_cie_sodeci_payees_pct: e.target.value })
                        }
                        className="w-full accent-[#B45309] cursor-pointer h-2 bg-slate-200 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>0% (Impayés fréquents / Risque élevé)</span>
                        <span>50% (Régularité moyenne)</span>
                        <span>100% (Paiements systématiquement à l'heure)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3 */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center text-xs font-bold border border-amber-200/50">
                      <i className="fas fa-hand-holding-dollar"></i>
                    </div>
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                        3. Caractéristiques du Crédit & Ratios Automatiques
                      </span>
                      <span className="text-[11px] text-slate-400">Montant demandé, échéance et calcul en direct du taux d'endettement</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Montant demandé (FCFA) *
                      </label>
                      <input
                        type="number"
                        min="10000"
                        step="5000"
                        required
                        value={dossierForm.montant_demande_fcfa}
                        onChange={(e) => setDossierForm({ ...dossierForm, montant_demande_fcfa: e.target.value })}
                        className="form-input font-mono w-full"
                        placeholder="Ex: 500000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Durée souhaitée (mois) *
                      </label>
                      <select
                        value={dossierForm.duree_mois}
                        onChange={(e) => setDossierForm({ ...dossierForm, duree_mois: Number(e.target.value) })}
                        className="form-select font-mono w-full"
                      >
                        {[3, 6, 9, 12, 18, 24, 36].map((m) => (
                          <option key={m} value={m}>
                            {m} mois
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 to-amber-100/40 border border-amber-200/80 flex flex-col justify-between shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#B45309]">
                          Mensualité Estimée
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            Number(formTauxEffortPct) > 45
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Effort : {formTauxEffortPct}%
                        </span>
                      </div>
                      <div className="font-mono text-base font-black text-slate-900 mt-2">
                        {formatFcfa(formMensualite)} <span className="text-xs text-slate-500 font-normal">/ mois</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {Number(formTauxEffortPct) > 45 ? "⚠️ Dépasse le seuil prudentiel de 45%" : "✓ Ratio d'endettement conforme"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Observations de l'agent de crédit
                    </label>
                    <textarea
                      rows="3"
                      value={dossierForm.observations_agent}
                      onChange={(e) => setDossierForm({ ...dossierForm, observations_agent: e.target.value })}
                      placeholder="Notes de l'entretien, garanties matérielles, caution solidaire, historique d'activité..."
                      className="form-textarea w-full"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button type="submit" disabled={loading} className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer">
                    <i className="fas fa-floppy-disk me-1.5"></i>
                    <span>Enregistrer (Sans évaluer)</span>
                  </button>
                  {!editingDossierId && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => handleSaveDossier(e, true)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#B45309] hover:bg-[#92400e] text-white text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-wand-magic-sparkles"></i>
                      <span>Enregistrer & Lancer le Scoring Python</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ====================================================================
              VUE 3 : LISTE DES DOSSIERS (BF09)
              ==================================================================== */}
          {activeTab === 'dossiers' && (
            <div className="premium-card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-100">
                    Portefeuille Microfinance
                  </span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 font-display">
                    Liste Complète des Dossiers de Crédit (BF09)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Recherche par référence, nom et filtrage multicritères.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingDossierId(null);
                    setDossierForm(INITIAL_DOSSIER_FORM);
                    setActiveTab('nouveau-dossier');
                  }}
                  className="btn-primary cursor-pointer"
                >
                  <i className="fas fa-plus text-xs"></i>
                  <span>+ Nouveau Dossier</span>
                </button>
              </div>

              {/* Filtres Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <input
                  type="text"
                  placeholder="Rechercher réf ou nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input text-xs"
                />

                <select
                  value={filterStatut}
                  onChange={(e) => setFilterStatut(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="">Tous les statuts</option>
                  <option value="en_cours">En attente (Non évalué)</option>
                  <option value="evalue">Évalué par l'IA</option>
                </select>

                <select
                  value={filterVille}
                  onChange={(e) => setFilterVille(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="">Toutes les villes</option>
                  {VILLES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>

                <select
                  value={filterRisque}
                  onChange={(e) => setFilterRisque(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="">Tous niveaux risque</option>
                  <option value="Faible">Risque Faible</option>
                  <option value="Moyen">Risque Moyen</option>
                  <option value="Élevé">Risque Élevé</option>
                </select>

                <button onClick={loadDossiers} className="btn-primary text-xs cursor-pointer">
                  <i className="fas fa-filter text-xs"></i> Filtrer
                </button>
              </div>

              {/* Tableau Dossiers */}
              <div className="table-responsive">
                <table className="custom-table min-w-[1250px]">
                  <thead>
                    <tr>
                      <th>RÉFÉRENCE</th>
                      <th>DEMANDEUR</th>
                      <th>PROFIL</th>
                      <th>VILLE</th>
                      <th>ACTIVITÉ</th>
                      <th>REVENU MENSUEL</th>
                      <th>MONTANT DEMANDÉ</th>
                      <th>DURÉE</th>
                      <th>SCORE ML</th>
                      <th>NIVEAU RISQUE</th>
                      <th className="text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dossiers.map((d) => {
                      const ev = d.derniere_evaluation;
                      return (
                        <tr key={d.id}>
                          <td className="font-mono font-bold text-xs text-[#B45309]">
                            <span className="bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/60 inline-block">
                              {d.reference}
                            </span>
                          </td>
                          <td className="font-bold text-slate-900 text-xs">
                            {d.nom_demandeur} {d.prenom_demandeur}
                          </td>
                          <td className="text-xs text-slate-600">
                            {d.age} ans &bull; {d.sexe === 'F' ? 'Femme' : 'Homme'}
                          </td>
                          <td className="capitalize text-xs text-slate-700">
                            {d.ville}
                          </td>
                          <td className="capitalize text-xs text-slate-500">
                            {d.activite}
                          </td>
                          <td className="font-mono text-xs font-bold text-slate-800">
                            {formatFcfa(d.revenu_mensuel_estime_fcfa)}
                          </td>
                          <td className="font-mono text-xs font-bold text-slate-900">
                            {formatFcfa(d.montant_demande_fcfa)}
                          </td>
                          <td className="font-mono text-xs text-slate-600">
                            {d.duree_mois} mois
                          </td>
                          <td className="font-mono text-xs">
                            {ev ? (
                              <span className="font-black text-slate-900">
                                {ev.score} <span className="text-slate-400 font-normal">/ 1000</span> <span className="text-slate-500 font-semibold text-[11px]">({ev.probabilite_defaut_pct}%)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px]">
                                En attente
                              </span>
                            )}
                          </td>
                          <td>
                            {ev ? (
                              <RiskBadge niveau={ev.niveau_risque} />
                            ) : (
                              <span className="text-xs text-slate-400 font-normal italic">Non évalué</span>
                            )}
                          </td>
                          <td className="text-right space-x-1.5">
                            <button
                              onClick={() => openDossierDetail(d.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-[#B45309] text-[#B45309] hover:text-white border border-amber-200/80 text-xs font-bold transition-all cursor-pointer shadow-sm"
                            >
                              Consulter
                            </button>
                            {d.statut === 'en_cours' && (
                              <>
                                <button
                                  onClick={() => startEditDossier(d)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                  title="Modifier"
                                >
                                  <i className="fas fa-pen text-xs"></i>
                                </button>
                                <button
                                  onClick={() => handleDeleteDossier(d.id, d.reference)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-bold transition-all cursor-pointer"
                                  title="Supprimer ce dossier"
                                >
                                  <i className="fas fa-trash text-xs"></i>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================================
              VUE 4 : DÉTAIL D'UN DOSSIER & SCORING (BF10, BF11, BF13)
              ==================================================================== */}
          {activeTab === 'dossier-detail' && selectedDossier && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('dossiers')}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer shadow-xs"
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        {selectedDossier.reference}
                      </span>
                      <span className="text-xs text-slate-400">
                        Créé le {formatDateTime(selectedDossier.created_at)}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5 font-display">
                      {selectedDossier.nom_demandeur} {selectedDossier.prenom_demandeur}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {selectedDossier.statut === 'en_cours' && (
                    <button
                      onClick={() => startEditDossier(selectedDossier)}
                      className="btn-white cursor-pointer"
                    >
                      <i className="fas fa-pen-to-square"></i> Modifier (BF08)
                    </button>
                  )}

                  {selectedDossier.derniere_evaluation && (
                    <button
                      onClick={() => handleOpenRapport(selectedDossier.id)}
                      className="btn-white cursor-pointer"
                    >
                      <i className="fas fa-file-pdf text-[#B45309]"></i> Rapport Imprimable (BF16)
                    </button>
                  )}

                  <button
                    onClick={() => handleLancerScoring(selectedDossier.id)}
                    disabled={loading}
                    className="btn-primary cursor-pointer"
                  >
                    <i className="fas fa-wand-magic-sparkles"></i>
                    <span>
                      {scoringLoadingId === selectedDossier.id
                        ? 'Calcul Python...'
                        : selectedDossier.derniere_evaluation
                        ? 'Relancer Évaluation'
                        : 'Lancer le Scoring Python (BF11)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Contenu 2 Colonnes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2 Colonnes Gauche : Variables */}
                <div className="lg:col-span-2 premium-card p-6 space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <i className="fas fa-id-card text-[#B45309]"></i>
                    <span>Variables du Demandeur & Données Alternatives</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Âge & Sexe</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {selectedDossier.age} ans &bull; {selectedDossier.sexe === 'F' ? 'Femme' : 'Homme'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Ville</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{selectedDossier.ville}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Activité</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5 capitalize">
                        {selectedDossier.activite}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Revenu Estimé</div>
                      <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                        {formatFcfa(selectedDossier.revenu_mensuel_estime_fcfa)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Montant Demandé</div>
                      <div className="font-mono font-extrabold text-[#B45309] text-sm mt-0.5">
                        {formatFcfa(selectedDossier.montant_demande_fcfa)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Durée</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {selectedDossier.duree_mois} mois
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                      <div className="text-[10px] font-bold uppercase text-[#B45309]">Ancienneté MM</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {selectedDossier.anciennete_mobile_money_mois} mois
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                      <div className="text-[10px] font-bold uppercase text-[#B45309]">Volume MM Mensuel</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        {formatFcfa(selectedDossier.volume_mm_mensuel_fcfa)}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                      <div className="text-[10px] font-bold uppercase text-[#B45309]">Factures CIE/SODECI</div>
                      <div className="font-mono font-extrabold text-emerald-700 text-sm mt-0.5">
                        {Math.round(selectedDossier.factures_cie_sodeci_payees_pct * 100)} %
                      </div>
                    </div>
                  </div>

                  {selectedDossier.observations_agent && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <strong>Observations de l'agent :</strong> {selectedDossier.observations_agent}
                    </div>
                  )}
                </div>

                {/* Colonne Droite : Jauge Scoring (BF13) */}
                <div className="premium-card p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <i className="fas fa-brain text-[#B45309]"></i>
                      <span>Résultat du Modèle IA (BF13)</span>
                    </h3>

                    <div className="pt-3">
                      <ScoreGauge evaluation={selectedDossier.derniere_evaluation} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              VUE 5 : RAPPORT D'ÉVALUATION IMPRIMABLE (BF16)
              ==================================================================== */}
          {activeTab === 'rapport' && rapportData && (
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between no-print">
                <button
                  onClick={() => openDossierDetail(rapportData.dossier.id)}
                  className="btn-white cursor-pointer"
                >
                  <i className="fas fa-arrow-left"></i> Retour
                </button>
                <button onClick={() => window.print()} className="btn-primary cursor-pointer">
                  <i className="fas fa-print"></i> Imprimer / Télécharger PDF
                </button>
              </div>

              <div className="premium-card p-8 space-y-6 bg-white">
                <div className="flex justify-between items-center border-b-2 border-[#B45309] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#B45309] text-white flex items-center justify-center font-black text-xl">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 font-display">
                        {rapportData.institution}
                      </h2>
                      <div className="text-xs text-slate-500 font-semibold">
                        {rapportData.titre_rapport}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>Date : {formatDateTime(rapportData.date_edition)}</div>
                    <div className="font-mono text-slate-800 font-bold">
                      Modèle : {rapportData.resultat_scoring.version_modele}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <table className="custom-table border border-slate-200">
                    <tbody>
                      <tr>
                        <th className="w-40">Référence Dossier</th>
                        <td className="font-mono font-bold text-[#B45309]">
                          {rapportData.dossier.reference}
                        </td>
                      </tr>
                      <tr>
                        <th>Demandeur</th>
                        <td className="font-bold">
                          {rapportData.dossier.nom_demandeur} {rapportData.dossier.prenom_demandeur}
                        </td>
                      </tr>
                      <tr>
                        <th>Ville & Activité</th>
                        <td className="capitalize">
                          {rapportData.dossier.ville} &bull; {rapportData.dossier.activite}
                        </td>
                      </tr>
                      <tr>
                        <th>Montant & Durée</th>
                        <td className="font-mono font-bold">
                          {formatFcfa(rapportData.dossier.montant_demande_fcfa)} sur{' '}
                          {rapportData.dossier.duree_mois} mois
                        </td>
                      </tr>
                      <tr>
                        <th>Mensualité théorique</th>
                        <td className="font-mono">
                          {formatFcfa(rapportData.indicateurs_financiers.mensualite_theorique_fcfa)} / mois
                          ({rapportData.indicateurs_financiers.taux_effort_mensuel_pct}%)
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div>
                    <ScoreGauge evaluation={rapportData.resultat_scoring} />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-bold text-slate-800">
                  <div>
                    <div className="mb-8">Signature de l'Agent de Crédit :</div>
                    <div className="border-b border-dashed border-slate-300 w-3/4"></div>
                  </div>
                  <div>
                    <div className="mb-8">Décision Finale du Comité :</div>
                    <div className="border-b border-dashed border-slate-300 w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              VUE 6 : HISTORIQUE TRAÇABLE DU SCORING (BF15)
              ==================================================================== */}
          {activeTab === 'historique' && (
            <div className="premium-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-100">
                  Audit & Traçabilité BF15
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 font-display">
                  Historique Complet des Évaluations de Risque
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Journal inaltérable de chaque prédiction effectuée par le modèle Python.
                </p>
              </div>

              <div className="table-responsive">
                <table className="custom-table min-w-[1150px]">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>RÉFÉRENCE</th>
                      <th>DEMANDEUR</th>
                      <th>MONTANT</th>
                      <th>PROBABILITÉ DÉFAUT</th>
                      <th>SCORE (/1000)</th>
                      <th>NIVEAU RISQUE</th>
                      <th>MODÈLE</th>
                      <th>DATE & HEURE</th>
                      <th className="text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {evaluations.map((ev) => (
                      <tr key={ev.id}>
                        <td className="font-mono text-xs text-slate-400">#{ev.id}</td>
                        <td className="font-mono font-bold text-xs text-[#B45309]">
                          <span className="bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/60 inline-block">
                            {ev.dossier?.reference}
                          </span>
                        </td>
                        <td className="font-bold text-xs text-slate-900">
                          {ev.dossier?.nom_demandeur} {ev.dossier?.prenom_demandeur}
                        </td>
                        <td className="font-mono text-xs font-bold text-slate-800">
                          {formatFcfa(ev.dossier?.montant_demande_fcfa)}
                        </td>
                        <td className="font-mono text-xs font-semibold text-slate-700">
                          {ev.probabilite_defaut_pct} %
                        </td>
                        <td className="font-mono text-xs font-black text-slate-900">
                          {ev.score} <span className="text-slate-400 font-normal">/ 1000</span>
                        </td>
                        <td>
                          <RiskBadge niveau={ev.niveau_risque} />
                        </td>
                        <td className="font-mono text-[11px] text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {ev.version_modele}
                          </span>
                        </td>
                        <td className="text-[11px] font-mono text-slate-500">
                          {formatDateTime(ev.created_at)}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => openDossierDetail(ev.dossier_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-[#B45309] text-[#B45309] hover:text-white border border-amber-200/80 text-xs font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <span>Dossier</span>
                            <i className="fas fa-chevron-right text-[10px]"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================================
              VUE 7 : GESTION DES UTILISATEURS (ADMIN BF03)
              ==================================================================== */}
          {activeTab === 'users' && user.role === 'admin' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 premium-card p-6 space-y-4">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-slate-900 font-display">
                    Comptes Utilisateurs & Rôles
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Activation, désactivation et contrôle des accès à la plateforme.
                  </p>
                </div>

                <div className="table-responsive">
                  <table className="custom-table min-w-[850px]">
                    <thead>
                      <tr>
                        <th>NOM COMPLET</th>
                        <th>E-MAIL</th>
                        <th>IDENTIFIANT</th>
                        <th>RÔLE</th>
                        <th>STATUT</th>
                        <th className="text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList.map((u) => (
                        <tr key={u.id}>
                          <td className="font-bold text-slate-900 text-xs">
                            {u.nom_complet}
                          </td>
                          <td className="text-xs font-mono text-slate-500">
                            {u.email}
                          </td>
                          <td className="font-mono text-xs font-bold text-slate-800">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {u.identifiant}
                            </span>
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-[#B45309] font-black text-[10px] uppercase border border-amber-200/60">
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                                u.is_active
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {u.is_active ? 'Actif' : 'Désactivé'}
                            </span>
                          </td>
                          <td className="text-right">
                            {u.id !== user.id ? (
                              <div className="inline-flex items-center gap-2 justify-end">
                                <button
                                  onClick={() => handleToggleUserActive(u.id)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                                    u.is_active
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                  title={u.is_active ? 'Désactiver temporairement le compte' : 'Réactiver le compte'}
                                >
                                  {u.is_active ? 'Désactiver' : 'Réactiver'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.nom_complet)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-slate-100 text-slate-500 border border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600"
                                  title="Supprimer définitivement cet utilisateur"
                                >
                                  <i className="fas fa-trash-can text-xs"></i>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic">Compte connecté</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formulaire Nouvel Utilisateur */}
              <div className="premium-card p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    + Nouveau Compte
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Création d'un agent ou admin.</p>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nom complet *</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.nom_complet}
                      onChange={(e) => setNewUserForm({ ...newUserForm, nom_complet: e.target.value })}
                      className="form-input text-xs"
                      placeholder="Ex: Koné Ibrahim"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Identifiant *</label>
                    <input
                      type="text"
                      required
                      value={newUserForm.identifiant}
                      onChange={(e) => setNewUserForm({ ...newUserForm, identifiant: e.target.value })}
                      className="form-input font-mono text-xs"
                      placeholder="agent.kone"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="form-input text-xs"
                      placeholder="kone@uiya.ci"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Rôle *</label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                      className="form-select text-xs"
                    >
                      <option value="agent">Agent de crédit</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe *</label>
                    <input
                      type="password"
                      required
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="form-input text-xs"
                      placeholder="••••••••"
                    />
                  </div>

                  <button type="submit" disabled={loading} className="w-full btn-primary text-xs cursor-pointer">
                    Créer l'utilisateur
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ====================================================================
              VUE 8 : PAGE MON PROFIL & SÉCURITÉ DU COMPTE (BF05)
              ==================================================================== */}
          {activeTab === 'profil' && (
            <div className="space-y-6 w-full">
              {/* Grand Bandeau Prestige Profil */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Grand Avatar Élégant */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 border-2 border-white/25 backdrop-blur-md text-white flex items-center justify-center text-3xl font-black shadow-2xl shrink-0 font-display">
                    {user.nom_complet ? user.nom_complet.charAt(0).toUpperCase() : 'U'}
                  </div>

                  <div className="text-center sm:text-left flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Compte Actif (Authentifié)
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        {user.role === 'admin' ? 'Administrateur Système' : 'Agent de Crédit'}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
                      {user.nom_complet}
                    </h1>

                    <p className="text-xs sm:text-sm text-amber-100/90 font-medium max-w-2xl">
                      Espace Agent &bull; Plateforme de Scoring de Crédit pour la Microfinance &bull;
                      Université Internationale de Yamoussoukro (UIYA)
                    </p>
                  </div>

                  <div className="shrink-0 flex sm:flex-col gap-2">
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-2 cursor-pointer backdrop-blur-sm"
                    >
                      <i className="fas fa-power-off text-xs"></i>
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Mini Cartes d'Activité de l'Agent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="premium-card p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider">Identifiant Unique</span>
                    <i className="fas fa-fingerprint text-[#B45309]"></i>
                  </div>
                  <div className="text-sm font-black font-mono text-slate-900">{user.identifiant}</div>
                  <div className="text-[10px] text-slate-400">Authentification API</div>
                </div>

                <div className="premium-card p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider">Dossiers Portefeuille</span>
                    <i className="fas fa-folder-open text-emerald-600"></i>
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-600">
                    {dashboard?.total_dossiers ?? '...'} dossier(s)
                  </div>
                  <div className="text-[10px] text-slate-400">Enregistrés dans MySQL</div>
                </div>

                <div className="premium-card p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider">Évaluations Réalisées</span>
                    <i className="fas fa-brain text-amber-700"></i>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-800">
                    {dashboard?.evaluations_realisees ?? '...'} analyse(s)
                  </div>
                  <div className="text-[10px] text-slate-400">Modèle Python v1.0.0</div>
                </div>

                <div className="premium-card p-4 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider">Session Active</span>
                    <i className="fas fa-shield-halved text-amber-600"></i>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-600">Bearer Token</div>
                  <div className="text-[10px] text-slate-400">Expire après inactivité (BNF03)</div>
                </div>
              </div>

              {/* Grille 2 Colonnes : Renseignements & Sécurité */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne 1 : Fiche Complète d'Informations */}
                <div className="premium-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 font-display">
                        Fiche d'Informations Personnelles
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Données enregistrées dans la base MySQL.</p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center text-xs">
                      <i className="fas fa-address-card"></i>
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Nom & Prénoms :</span>
                      <span className="font-bold text-slate-900">{user.nom_complet}</span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Identifiant de connexion :</span>
                      <span className="font-mono font-bold text-[#B45309]">{user.identifiant}</span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Adresse e-mail :</span>
                      <span className="font-medium text-slate-800">{user.email}</span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Téléphone :</span>
                      <span className="font-mono text-slate-800">{user.telephone || 'Non renseigné'}</span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Rôle attribué (BF04) :</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B45309] font-black text-[10px] uppercase">
                        {user.role === 'admin' ? 'Administrateur' : 'Agent de crédit'}
                      </span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Établissement académique :</span>
                      <span className="font-bold text-slate-800 text-right">
                        UIYA (Yamoussoukro, Côte d'Ivoire)
                      </span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Hachage du mot de passe :</span>
                      <span className="font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded text-[11px]">
                        Bcrypt SHA-256 (BNF02)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Colonne 2 : Changement de Mot de Passe (BF05) */}
                <div className="premium-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 font-display">
                        Modifier mon Mot de Passe (BF05)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Exigence de sécurité du cahier des charges (Section 9.1).
                      </p>
                    </div>
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                      <i className="fas fa-key"></i>
                    </span>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Mot de passe actuel *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <i className="fas fa-lock text-xs"></i>
                        </div>
                        <input
                          type="password"
                          required
                          value={pwdForm.current_password}
                          onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-[#B45309] outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nouveau mot de passe (min. 6 caractères) *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <i className="fas fa-shield-keyhole text-xs"></i>
                        </div>
                        <input
                          type="password"
                          required
                          value={pwdForm.new_password}
                          onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-[#B45309] outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Confirmer le nouveau mot de passe *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <i className="fas fa-check-double text-xs"></i>
                        </div>
                        <input
                          type="password"
                          required
                          value={pwdForm.new_password_confirmation}
                          onChange={(e) =>
                            setPwdForm({ ...pwdForm, new_password_confirmation: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-[#B45309] outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-circle-notch fa-spin"></i>
                          <span>Mise à jour en cours...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-floppy-disk"></i>
                          <span>Enregistrer le nouveau mot de passe</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              VUE 8-bis : MODÈLE IA & MÉTRIQUES TECHNIQUES (BF18, BNF07)
              ==================================================================== */}
          {activeTab === 'modele-ia' && (
            <div className="space-y-6 w-full">
              <div className="border-b border-slate-100 pb-4">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-[#B45309] border border-amber-100">
                  Régression Logistique Équilibrée &bull; BNF07
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 font-display">
                  Paramètres & Métriques Scientifiques du Modèle IA
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Résultats validés dans le notebook Anaconda <code className="text-[#B45309]">entrainement_scoring_microfinance.ipynb</code> sur 1 200 dossiers de test.
                </p>
              </div>

              {modelSettings && (
                <div className="space-y-6">
                  {/* Cartes KPI Modèle */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="premium-card p-5 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Algorithme Sélectionné
                      </div>
                      <div className="text-base font-black text-slate-900">{modelSettings.algorithm}</div>
                      <p className="text-[11px] text-slate-500">Pondération des classes équilibrée</p>
                    </div>

                    <div className="premium-card p-5 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Version Actuelle du Modèle
                      </div>
                      <div className="text-base font-black font-mono text-[#B45309]">
                        {modelSettings.model_version}
                      </div>
                      <p className="text-[11px] text-slate-500">Enregistré dans model_scoring_microfinance_v1.joblib</p>
                    </div>

                    <div className="premium-card p-5 space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Taille du Dataset
                      </div>
                      <div className="text-base font-black font-mono text-emerald-600">
                        {modelSettings.dataset?.total_rows} dossiers
                      </div>
                      <p className="text-[11px] text-slate-500">4 800 train (80%) + 1 200 test (20%)</p>
                    </div>
                  </div>

                  {/* 3 Mesures de Performance Scientifique (BNF07) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="premium-card p-5 text-center space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400">Score F1 Harmonique</div>
                      <div className="text-3xl font-black font-mono text-[#B45309]">
                        {modelSettings.metrics_bnf07?.f1_score_pct} %
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Équilibre Précision / Détection</div>
                    </div>

                    <div className="premium-card p-5 text-center space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400">Rappel (Défauts Attrapés)</div>
                      <div className="text-3xl font-black font-mono text-emerald-600">
                        {modelSettings.metrics_bnf07?.recall_pct} %
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">151 mauvais payeurs détectés / 244</div>
                    </div>

                    <div className="premium-card p-5 text-center space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400">ROC-AUC Global</div>
                      <div className="text-3xl font-black font-mono text-amber-800">
                        {modelSettings.metrics_bnf07?.roc_auc_pct} %
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">Pouvoir discriminant du modèle</div>
                    </div>
                  </div>

                  {/* Matrice de Confusion */}
                  <div className="premium-card p-6 space-y-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Matrice de Confusion sur les 1 200 Dossiers de Test (BNF07)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Conformité exigée à la Section 8.2 du cahier des charges.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="custom-table border border-slate-200">
                        <thead>
                          <tr>
                            <th>Réalité du Portefeuille \ Prédiction</th>
                            <th>Prédit : Remboursé (0)</th>
                            <th>Prédit : Défaut de Paiement (1)</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                          <tr>
                            <th className="font-sans font-bold">Réel : Remboursé (0)</th>
                            <td className="text-emerald-700 font-bold bg-emerald-50/50">
                              VN = {modelSettings.metrics_bnf07?.confusion_matrix?.true_negatives_vn}
                              <span className="text-[10px] block font-sans text-slate-400 font-normal">
                                Vrais Négatifs (Bons payeurs autorisés)
                              </span>
                            </td>
                            <td className="text-amber-700 font-bold bg-amber-50/40">
                              FP = {modelSettings.metrics_bnf07?.confusion_matrix?.false_positives_fp}
                              <span className="text-[10px] block font-sans text-slate-400 font-normal">
                                Faux Positifs (Bons payeurs pris pour risque)
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <th className="font-sans font-bold">Réel : Défaut de Paiement (1)</th>
                            <td className="text-rose-700 font-bold bg-rose-50/40">
                              FN = {modelSettings.metrics_bnf07?.confusion_matrix?.false_negatives_fn}
                              <span className="text-[10px] block font-sans text-slate-400 font-normal">
                                Faux Négatifs (Défauts non anticipés)
                              </span>
                            </td>
                            <td className="text-emerald-700 font-bold bg-emerald-50/50">
                              VP = {modelSettings.metrics_bnf07?.confusion_matrix?.true_positives_vp}
                              <span className="text-[10px] block font-sans text-slate-400 font-normal">
                                Vrais Positifs (Défauts interceptés par l'IA)
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
