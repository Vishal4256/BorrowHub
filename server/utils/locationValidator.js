/**
 * Geographic coordinate and structured GeoJSON location validation utilities.
 * Enforces GeoJSON coordinate order: [longitude, latitude].
 */

export function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return NaN;
  if (typeof value === 'boolean') return NaN;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

export function isValidLatitude(lat) {
  const num = parseCoordinate(lat);
  return !Number.isNaN(num) && num >= -90 && num <= 90;
}

export function isValidLongitude(lng) {
  const num = parseCoordinate(lng);
  return !Number.isNaN(num) && num >= -180 && num <= 180;
}

export function validateLatLng(lat, lng) {
  const parsedLat = parseCoordinate(lat);
  const parsedLng = parseCoordinate(lng);

  if (Number.isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
    return {
      valid: false,
      error: 'Invalid latitude. Latitude must be a finite number between -90 and 90.'
    };
  }

  if (Number.isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    return {
      valid: false,
      error: 'Invalid longitude. Longitude must be a finite number between -180 and 180.'
    };
  }

  return {
    valid: true,
    latitude: parsedLat,
    longitude: parsedLng
  };
}

export function buildGeoJsonPoint(longitude, latitude) {
  const check = validateLatLng(latitude, longitude);
  if (!check.valid) {
    throw new Error(check.error);
  }
  return {
    type: 'Point',
    coordinates: [check.longitude, check.latitude]
  };
}

export function formatLocationLabel(details = {}) {
  const parts = [details.city, details.state, details.country]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (typeof details.address === 'string' && details.address.trim()) {
    return details.address.trim();
  }
  return '';
}

function sanitizeString(value, maxLen = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

/**
 * Validates and normalizes an incoming structured location payload.
 * Accepts either:
 * - { address, city, state, country, postalCode, coordinates: { type: 'Point', coordinates: [lng, lat] } }
 * - { address, city, state, country, postalCode, latitude, longitude }
 */
export function normalizeLocationInput(rawLocation, { requireCoordinates = false } = {}) {
  if (!rawLocation || typeof rawLocation !== 'object' || Array.isArray(rawLocation)) {
    return { valid: false, error: 'Location payload must be a valid object.' };
  }

  const address = sanitizeString(rawLocation.address, 300);
  const city = sanitizeString(rawLocation.city, 120);
  const state = sanitizeString(rawLocation.state, 120);
  const country = sanitizeString(rawLocation.country, 120);
  const postalCode = sanitizeString(rawLocation.postalCode, 40);

  let coordinatesObj;
  const rawGeo = rawLocation.coordinates;

  if (rawGeo !== undefined && rawGeo !== null) {
    if (typeof rawGeo !== 'object' || Array.isArray(rawGeo)) {
      return {
        valid: false,
        error: 'coordinates must be a GeoJSON Point object: { type: "Point", coordinates: [longitude, latitude] }.'
      };
    }
    if (rawGeo.type !== 'Point') {
      return {
        valid: false,
        error: 'GeoJSON coordinates.type must be "Point".'
      };
    }
    if (!Array.isArray(rawGeo.coordinates) || rawGeo.coordinates.length !== 2) {
      return {
        valid: false,
        error: 'GeoJSON coordinates.coordinates must be a 2-element [longitude, latitude] array.'
      };
    }
    const [lng, lat] = rawGeo.coordinates;
    const check = validateLatLng(lat, lng);
    if (!check.valid) {
      return { valid: false, error: check.error };
    }
    coordinatesObj = {
      type: 'Point',
      coordinates: [check.longitude, check.latitude]
    };
  } else if (rawLocation.latitude !== undefined || rawLocation.longitude !== undefined) {
    const check = validateLatLng(rawLocation.latitude, rawLocation.longitude);
    if (!check.valid) {
      return { valid: false, error: check.error };
    }
    coordinatesObj = {
      type: 'Point',
      coordinates: [check.longitude, check.latitude]
    };
  } else if (requireCoordinates) {
    return {
      valid: false,
      error: 'Valid geographic coordinates [longitude, latitude] are required.'
    };
  }

  const displayLabel =
    formatLocationLabel({ address, city, state, country }) ||
    address;

  const value = {
    address: address || displayLabel,
    city,
    state,
    country,
    postalCode,
    ...(coordinatesObj ? { coordinates: coordinatesObj } : {})
  };

  return {
    valid: true,
    value,
    displayLabel
  };
}
