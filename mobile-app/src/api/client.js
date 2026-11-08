// Client API React Native pour communiquer avec le backend Laravel + MySQL

let currentApiBaseUrl = 'http://127.0.0.1:8000/api';
let currentAuthToken = '';

export function setApiBaseUrl(url) {
  if (url && url.trim()) {
    currentApiBaseUrl = url.trim().replace(/\/+$/, '');
  }
}

export function getApiBaseUrl() {
  return currentApiBaseUrl;
}

export function setAuthToken(token) {
  currentAuthToken = token || '';
}

export function getAuthToken() {
  return currentAuthToken;
}

export async function mobileApiRequest(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (currentAuthToken) {
    headers.Authorization = `Bearer ${currentAuthToken}`;
  }

  let response;
  try {
    response = await fetch(`${currentApiBaseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error(
      `Impossible de joindre le serveur Laravel (${currentApiBaseUrl}). Vérifiez que php artisan serve est actif et que l'adresse IP est correcte.`
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
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
    throw err;
  }

  return payload;
}

export function formatFcfaMobile(value) {
  const num = Math.round(Number(value || 0));
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
}

