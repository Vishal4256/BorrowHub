import { validateLatLng, buildGeoJsonPoint, formatLocationLabel } from '../utils/locationValidator.js';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 500;
const geocodeCache = new Map();

function getCached(key) {
  const entry = geocodeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    geocodeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  if (geocodeCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = geocodeCache.keys().next().value;
    if (oldestKey) geocodeCache.delete(oldestKey);
  }
  geocodeCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

export function clearGeocodeCache() {
  geocodeCache.clear();
}

function extractAddressParts(addr = {}, fallbackName = '') {
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.state_district ||
    addr.county ||
    addr.suburb ||
    (fallbackName && fallbackName !== addr.state && fallbackName !== addr.country ? fallbackName : '') ||
    '';

  const locality =
    addr.neighbourhood ||
    addr.suburb ||
    addr.quarter ||
    addr.road ||
    '';

  const state = addr.state || addr.region || addr.province || '';
  const country = addr.country || '';
  const postalCode = addr.postcode || '';

  return {
    locality,
    city,
    state,
    country,
    postalCode
  };
}

export function normalizeNominatimPlace(item) {
  if (!item || typeof item !== 'object') return null;
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  const check = validateLatLng(lat, lng);
  if (!check.valid) return null;

  const parts = extractAddressParts(item.address || {}, item.name || '');
  const formattedShort = formatLocationLabel({
    city: parts.city || parts.locality,
    state: parts.state,
    country: parts.country
  });

  const address = item.display_name || formattedShort || `${check.latitude.toFixed(4)}, ${check.longitude.toFixed(4)}`;

  return {
    id: String(item.place_id || `${check.longitude},${check.latitude}`),
    address,
    city: parts.city || parts.locality,
    state: parts.state,
    country: parts.country,
    postalCode: parts.postalCode,
    label: formattedShort || address,
    coordinates: buildGeoJsonPoint(check.longitude, check.latitude)
  };
}

function normalizeGeoapifyFeature(feature) {
  if (!feature || typeof feature !== 'object') return null;
  const props = feature.properties || feature;
  const lat = Number(props.lat ?? feature.geometry?.coordinates?.[1]);
  const lng = Number(props.lon ?? feature.geometry?.coordinates?.[0]);
  const check = validateLatLng(lat, lng);
  if (!check.valid) return null;

  const city = props.city || props.town || props.village || props.county || props.suburb || '';
  const state = props.state || '';
  const country = props.country || '';
  const postalCode = props.postcode || '';
  const formattedShort = formatLocationLabel({ city, state, country });
  const address = props.formatted || formattedShort;

  return {
    id: String(props.place_id || `${check.longitude},${check.latitude}`),
    address,
    city,
    state,
    country,
    postalCode,
    label: formattedShort || address,
    coordinates: buildGeoJsonPoint(check.longitude, check.latitude)
  };
}

function getProviderConfig() {
  const provider = (process.env.GEOCODING_PROVIDER || 'nominatim').toLowerCase().trim();
  const apiKey = process.env.GEOCODING_API_KEY ? process.env.GEOCODING_API_KEY.trim() : '';
  const userAgent =
    process.env.GEOCODER_USER_AGENT ||
    'BorrowHub/1.0 (https://borrowhub512.vercel.app; vishal42564256@gmail.com)';

  const baseUrl = process.env.GEOCODING_BASE_URL
    ? process.env.GEOCODING_BASE_URL.replace(/\/$/, '')
    : provider === 'locationiq'
    ? 'https://us1.locationiq.com/v1'
    : provider === 'geoapify'
    ? 'https://api.geoapify.com/v1/geocode'
    : 'https://nominatim.openstreetmap.org';

  return { provider, apiKey, userAgent, baseUrl };
}

async function fetchWithTimeout(url, options = {}, fetchImpl = fetch, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Search locations by free-text query (city, locality, area, postal code).
 */
export async function searchLocations(query, { limit = 5, fetchImpl = fetch } = {}) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    const err = new Error('Search query must be at least 2 characters long.');
    err.statusCode = 400;
    throw err;
  }

  const trimmed = query.trim();
  if (trimmed.length > 150) {
    const err = new Error('Search query cannot exceed 150 characters.');
    err.statusCode = 400;
    throw err;
  }

  const safeLimit = Math.min(10, Math.max(1, Number(limit) || 5));
  const { provider, apiKey, userAgent, baseUrl } = getProviderConfig();
  const cacheKey = `search:${provider}:${trimmed.toLowerCase()}:${safeLimit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let url;
  const headers = {
    Accept: 'application/json'
  };

  if (provider === 'geoapify') {
    if (!apiKey) {
      const err = new Error('GEOCODING_API_KEY is required when GEOCODING_PROVIDER=geoapify.');
      err.statusCode = 503;
      throw err;
    }
    const params = new URLSearchParams({
      text: trimmed,
      limit: String(safeLimit),
      apiKey
    });
    url = `${baseUrl}/search?${params.toString()}`;
  } else if (provider === 'locationiq') {
    if (!apiKey) {
      const err = new Error('GEOCODING_API_KEY is required when GEOCODING_PROVIDER=locationiq.');
      err.statusCode = 503;
      throw err;
    }
    const params = new URLSearchParams({
      key: apiKey,
      q: trimmed,
      format: 'json',
      addressdetails: '1',
      limit: String(safeLimit)
    });
    url = `${baseUrl}/search?${params.toString()}`;
  } else {
    headers['User-Agent'] = userAgent;
    const params = new URLSearchParams({
      q: trimmed,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(safeLimit)
    });
    url = `${baseUrl}/search?${params.toString()}`;
  }

  let res;
  try {
    res = await fetchWithTimeout(url, { headers }, fetchImpl);
  } catch (networkErr) {
    const err = new Error(
      networkErr.name === 'AbortError'
        ? 'Geocoding service timed out. Please try again.'
        : 'Unable to reach geocoding service. Please check your connection and try again.'
    );
    err.statusCode = 502;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`Geocoding provider returned status ${res.status}.`);
    err.statusCode = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  let results = [];

  if (provider === 'geoapify') {
    const features = Array.isArray(data?.features) ? data.features : [];
    results = features.map(normalizeGeoapifyFeature).filter(Boolean);
  } else {
    const list = Array.isArray(data) ? data : [];
    results = list.map(normalizeNominatimPlace).filter(Boolean);
  }

  setCached(cacheKey, results);
  return results;
}

/**
 * Reverse geocode latitude & longitude into a structured address and GeoJSON Point.
 */
export async function reverseGeocode(lat, lng, { fetchImpl = fetch } = {}) {
  const check = validateLatLng(lat, lng);
  if (!check.valid) {
    const err = new Error(check.error);
    err.statusCode = 400;
    throw err;
  }

  const { provider, apiKey, userAgent, baseUrl } = getProviderConfig();
  const roundedLat = check.latitude.toFixed(5);
  const roundedLng = check.longitude.toFixed(5);
  const cacheKey = `reverse:${provider}:${roundedLat}:${roundedLng}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let url;
  const headers = {
    Accept: 'application/json'
  };

  if (provider === 'geoapify') {
    if (!apiKey) {
      const err = new Error('GEOCODING_API_KEY is required when GEOCODING_PROVIDER=geoapify.');
      err.statusCode = 503;
      throw err;
    }
    const params = new URLSearchParams({
      lat: String(check.latitude),
      lon: String(check.longitude),
      apiKey
    });
    url = `${baseUrl}/reverse?${params.toString()}`;
  } else if (provider === 'locationiq') {
    if (!apiKey) {
      const err = new Error('GEOCODING_API_KEY is required when GEOCODING_PROVIDER=locationiq.');
      err.statusCode = 503;
      throw err;
    }
    const params = new URLSearchParams({
      key: apiKey,
      lat: String(check.latitude),
      lon: String(check.longitude),
      format: 'json',
      addressdetails: '1'
    });
    url = `${baseUrl}/reverse?${params.toString()}`;
  } else {
    headers['User-Agent'] = userAgent;
    const params = new URLSearchParams({
      lat: String(check.latitude),
      lon: String(check.longitude),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '16'
    });
    url = `${baseUrl}/reverse?${params.toString()}`;
  }

  let res;
  try {
    res = await fetchWithTimeout(url, { headers }, fetchImpl);
  } catch (networkErr) {
    const err = new Error(
      networkErr.name === 'AbortError'
        ? 'Reverse geocoding service timed out. Please try again.'
        : 'Unable to reach reverse geocoding service. Please check your connection and try again.'
    );
    err.statusCode = 502;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`Reverse geocoding provider returned status ${res.status}.`);
    err.statusCode = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  let normalized = null;

  if (provider === 'geoapify') {
    const feature = Array.isArray(data?.features) ? data.features[0] : null;
    normalized = normalizeGeoapifyFeature(feature);
  } else {
    if (data && !data.error) {
      // Preserve exact detected coordinates alongside resolved address fields
      const parsed = normalizeNominatimPlace({
        ...data,
        lat: check.latitude,
        lon: check.longitude
      });
      normalized = parsed;
    }
  }

  if (!normalized) {
    const err = new Error('Could not resolve an address for these coordinates.');
    err.statusCode = 404;
    throw err;
  }

  // Ensure exact input coordinates in [lng, lat] GeoJSON order
  normalized.coordinates = buildGeoJsonPoint(check.longitude, check.latitude);

  setCached(cacheKey, normalized);
  return normalized;
}
