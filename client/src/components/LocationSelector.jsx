import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

function formatShortPlace(loc) {
  if (!loc) return '';
  const parts = [loc.city, loc.state].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return loc.label || loc.address || '';
}

function getGeolocationErrorMessage(err) {
  if (!err) return 'Unable to detect your location. Please enter your location manually.';
  switch (err.code) {
    case 1:
      return 'Location permission was denied. Please allow location access in your browser or enter your location manually below.';
    case 2:
      return 'Your location is currently unavailable. Please try again or enter your location manually.';
    case 3:
      return 'Location detection timed out. Please try again or enter your location manually.';
    default:
      return err.message || 'Could not detect current location. Please enter your location manually.';
  }
}

export default function LocationSelector({
  value = null,
  onSelect,
  onClear,
  savedLocation = null,
  label = 'Location',
  placeholder = 'Search city, area, locality, or postal code...',
  compact = false
}) {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [pendingGpsLocation, setPendingGpsLocation] = useState(null);

  const [showManualInput, setShowManualInput] = useState(!value);
  const searchReqIdRef = useRef(0);

  const hasSavedLocation = Boolean(
    savedLocation &&
    savedLocation.coordinates &&
    Array.isArray(savedLocation.coordinates.coordinates) &&
    savedLocation.coordinates.coordinates.length === 2
  );

  // Debounced manual location search
  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed.length < 2) {
      return;
    }

    const reqId = ++searchReqIdRef.current;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError(null);
        const data = await api.searchLocations(trimmed, 5);
        if (searchReqIdRef.current !== reqId) return;
        setSuggestions(Array.isArray(data?.results) ? data.results : []);
        setHasSearched(true);
      } catch (err) {
        if (searchReqIdRef.current !== reqId) return;
        setSuggestions([]);
        setHasSearched(true);
        setSearchError(err.message || 'Failed to look up locations. Please try again.');
      } finally {
        if (searchReqIdRef.current === reqId) {
          setSearching(false);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handleSearchTextChange = (nextValue) => {
    setSearchText(nextValue);
    if (nextValue.trim().length < 2) {
      searchReqIdRef.current += 1;
      setSuggestions([]);
      setSearchError(null);
      setHasSearched(false);
    }
  };

  const handleManualSearchNow = async () => {
    const trimmed = searchText.trim();
    if (trimmed.length < 2) {
      setSearchError('Enter at least 2 characters (city, locality, area, or postal code).');
      return;
    }

    const reqId = ++searchReqIdRef.current;
    try {
      setSearching(true);
      setSearchError(null);
      const data = await api.searchLocations(trimmed, 5);
      if (searchReqIdRef.current !== reqId) return;
      setSuggestions(Array.isArray(data?.results) ? data.results : []);
      setHasSearched(true);
    } catch (err) {
      if (searchReqIdRef.current !== reqId) return;
      setSuggestions([]);
      setHasSearched(true);
      setSearchError(err.message || 'Location search failed.');
    } finally {
      if (searchReqIdRef.current === reqId) {
        setSearching(false);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    setGpsError(null);
    setSearchError(null);
    setPendingGpsLocation(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please enter your location manually.');
      setShowManualInput(true);
      return;
    }

    setDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position?.coords?.latitude;
          const lng = position?.coords?.longitude;

          if (
            typeof lat !== 'number' ||
            typeof lng !== 'number' ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            throw new Error('Received invalid GPS coordinates from browser.');
          }

          const data = await api.reverseGeocode(lat, lng);
          if (!data?.location) {
            throw new Error('Could not resolve address for your coordinates.');
          }

          setPendingGpsLocation(data.location);
        } catch (err) {
          setGpsError(err.message || 'Failed to resolve address from GPS coordinates. Please enter manually.');
          setShowManualInput(true);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        setGpsError(getGeolocationErrorMessage(err));
        setShowManualInput(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleConfirmGps = () => {
    if (!pendingGpsLocation) return;
    const confirmed = pendingGpsLocation;
    setPendingGpsLocation(null);
    setShowManualInput(false);
    setSearchText('');
    setSuggestions([]);
    setGpsError(null);
    setSearchError(null);
    if (onSelect) onSelect(confirmed);
  };

  const handleChangeGps = () => {
    setPendingGpsLocation(null);
    setShowManualInput(true);
  };

  const handleSelectSuggestion = (loc) => {
    if (!loc?.coordinates?.coordinates || loc.coordinates.coordinates.length !== 2) {
      setSearchError('Selected location is missing verified coordinates.');
      return;
    }
    setPendingGpsLocation(null);
    setShowManualInput(false);
    setSearchText('');
    setSuggestions([]);
    setHasSearched(false);
    setSearchError(null);
    setGpsError(null);
    if (onSelect) onSelect(loc);
  };

  const handleClear = () => {
    setPendingGpsLocation(null);
    setSearchText('');
    setSuggestions([]);
    setHasSearched(false);
    setGpsError(null);
    setSearchError(null);
    setShowManualInput(true);
    if (onClear) onClear();
  };

  const activeLabel = formatShortPlace(value);

  return (
    <div className="space-y-2.5" data-testid="location-selector">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[#151e18]">{label}</label>
          {value && (
            <button
              type="button"
              onClick={() => setShowManualInput((prev) => !prev)}
              className="text-[11px] font-semibold text-[#006c48] hover:underline"
            >
              {showManualInput ? 'Hide Search' : 'Change Location'}
            </button>
          )}
        </div>
      )}

      {/* Confirmed Selected Location Pill */}
      {value && !pendingGpsLocation && (
        <div className="p-3 rounded-xl bg-[#f2fcf2] border border-[#006c48]/30 flex items-center justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className="material-symbols-outlined text-[#006c48] text-[18px] mt-0.5 flex-shrink-0">
              location_on
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#00261d] truncate">{activeLabel || 'Selected Location'}</p>
              {value.address && value.address !== activeLabel && (
                <p className="text-[11px] text-[#414845] line-clamp-1">{value.address}</p>
              )}
              {value.postalCode && (
                <p className="text-[10px] text-[#717975]">Postal Code: {value.postalCode}</p>
              )}
            </div>
          </div>

          {onClear && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear location"
              className="px-2.5 py-1 rounded-full border border-[#c0c8c4] bg-white text-[11px] font-semibold text-[#414845] hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a] transition-colors flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* GPS Confirmation Card */}
      {pendingGpsLocation && (
        <div
          className="p-3.5 rounded-xl bg-[#e6f1e7] border border-[#006c48] space-y-2.5"
          data-testid="gps-confirmation-card"
        >
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#006c48] text-[18px] mt-0.5 flex-shrink-0">
              my_location
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#006c48]">
                Detected Current Location
              </p>
              <p className="text-xs font-bold text-[#00261d]">
                {formatShortPlace(pendingGpsLocation)}
              </p>
              <p className="text-[11px] text-[#414845] leading-snug mt-0.5">
                {pendingGpsLocation.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmGps}
              className="px-3.5 py-1.5 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-colors"
            >
              Confirm Location
            </button>
            <button
              type="button"
              onClick={handleChangeGps}
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#c0c8c4] text-[#414845] hover:bg-[#FAFBF8] text-xs font-semibold transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Row: GPS & Saved Location */}
      <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'pt-0.5'}`}>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={detectingGps}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ecf6ed] hover:bg-[#d5ebdd] border border-[#006c48]/25 text-[#006c48] text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">
            {detectingGps ? 'progress_activity' : 'my_location'}
          </span>
          <span>{detectingGps ? 'Detecting location...' : 'Use Current Location'}</span>
        </button>

        {hasSavedLocation && (
          <button
            type="button"
            onClick={() => handleSelectSuggestion(savedLocation)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#f2fcf2] border border-[#c0c8c4] text-[#151e18] text-xs font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-[#006c48]">bookmark</span>
            <span>Use Saved: {formatShortPlace(savedLocation)}</span>
          </button>
        )}
      </div>

      {/* GPS Error Notice */}
      {gpsError && (
        <div
          role="alert"
          className="p-2.5 rounded-xl bg-[#ffdad6]/70 border border-[#ba1a1a]/30 text-[11px] text-[#93000a] flex items-start gap-2"
        >
          <span className="material-symbols-outlined text-[16px] flex-shrink-0">location_off</span>
          <span>{gpsError}</span>
        </div>
      )}

      {/* Manual Location Search Input */}
      {(showManualInput || !value) && !pendingGpsLocation && (
        <div className="space-y-1.5 relative">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[15px] text-[#717975]">
                search
              </span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => handleSearchTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSearchNow();
                  }
                }}
                placeholder={placeholder}
                aria-label="Enter location manually"
                className="w-full bg-[#FAFBF8] border border-[#c0c8c4] rounded-xl pl-8 pr-3 py-2 text-xs text-[#151e18] placeholder:text-[#717975] focus:outline-none focus:border-[#006c48]"
              />
            </div>

            <button
              type="button"
              onClick={handleManualSearchNow}
              disabled={searching || searchText.trim().length < 2}
              className="px-3 py-2 rounded-xl bg-[#123c32] hover:bg-[#006c48] text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              {searching ? '...' : 'Find'}
            </button>
          </div>

          <p className="text-[10px] text-[#717975]">
            Enter a city, area, or postal code and choose a verified match from suggestions.
          </p>

          {/* Search Error */}
          {searchError && (
            <div
              role="alert"
              className="p-2 rounded-xl bg-[#ffdad6]/70 border border-[#ba1a1a]/30 text-[11px] text-[#93000a]"
            >
              {searchError}
            </div>
          )}

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <ul
              role="listbox"
              aria-label="Location suggestions"
              className="bg-white border border-[#dbe5dc] rounded-xl shadow-lg divide-y divide-[#f2fcf2] max-h-52 overflow-y-auto z-30"
            >
              {suggestions.map((loc, idx) => (
                <li key={loc.id || idx}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => handleSelectSuggestion(loc)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#ecf6ed] transition-colors flex items-start gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#006c48] mt-0.5 flex-shrink-0">
                      location_on
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#00261d] truncate">{loc.label || loc.city || loc.address}</p>
                      <p className="text-[11px] text-[#717975] line-clamp-1">{loc.address}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Empty Suggestions State */}
          {!searching && hasSearched && suggestions.length === 0 && !searchError && (
            <div className="p-2.5 rounded-xl bg-[#FAFBF8] border border-[#dbe5dc] text-[11px] text-[#717975]">
              No matching verified locations found for "{searchText.trim()}". Try a nearby city or postal code.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
