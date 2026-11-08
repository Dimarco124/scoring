const API_BASE = '/api';

export function getStoredToken() {
  return localStorage.getItem('finscore_token') || '';
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('finscore_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(token, user) {
  localStorage.setItem('finscore_token', token);
  localStorage.setItem('finscore_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('finscore_token');
  localStorage.removeItem('finscore_user');
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      clearAuthSession();
    }
    const validationErrors = payload?.errors
      ? Object.values(payload.errors).flat().join(' ')
      : null;
    const message =
      validationErrors ||
      payload?.message ||
      payload?.error ||
      `Erreur HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

export function formatFcfa(amount) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('fr-FR').format(Math.round(num)) + ' FCFA';
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

