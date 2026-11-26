const PRODUCTION_API_URL = 'https://borrowhub.onrender.com/api';

function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
}

function normalizeApiUrl(url) {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`[BorrowHub Config Error] Invalid VITE_API_URL "${url}". Expected an http(s) URL.`);
  }
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/**
 * Resolves and validates the API base URL.
 * Production builds must never fall back to localhost.
 */
export function resolveApiBaseUrl({ viteApiUrl, isProd, devFallback = '' } = {}) {
  const raw = typeof viteApiUrl === 'string' ? viteApiUrl.trim() : '';

  if (isProd) {
    if (!raw) {
      console.warn(
        '[BorrowHub Config] VITE_API_URL is not set in production environment; using production backend URL.'
      );
      return PRODUCTION_API_URL;
    }

    const normalized = normalizeApiUrl(raw);
    if (isLocalhostUrl(normalized)) {
      throw new Error(
        `[BorrowHub Config Error] Production build cannot use a localhost API URL ("${normalized}"). Configure VITE_API_URL=${PRODUCTION_API_URL} in Vercel.`
      );
    }

    return normalized;
  }

  return raw ? normalizeApiUrl(raw) : devFallback;
}

export const API_BASE_URL = import.meta.env.PROD
  ? resolveApiBaseUrl({
      viteApiUrl: import.meta.env.VITE_API_URL,
      isProd: true
    })
  : resolveApiBaseUrl({
      viteApiUrl: import.meta.env.VITE_API_URL,
      isProd: false,
      devFallback: 'http://localhost:5000/api'
    });
