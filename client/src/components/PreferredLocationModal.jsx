import React, { useState } from 'react';
import LocationSelector from './LocationSelector';
import { useAuth } from '../context/AuthContext';

export default function PreferredLocationModal({ isOpen, onClose }) {
  const { user, updateUserLocation } = useAuth();
  const [draftLocation, setDraftLocation] = useState(user?.preferredLocation || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    if (!draftLocation?.coordinates?.coordinates) {
      setError('Please select a verified location or detect via GPS before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await updateUserLocation({
        address: draftLocation.address || '',
        city: draftLocation.city || '',
        state: draftLocation.state || '',
        country: draftLocation.country || '',
        postalCode: draftLocation.postalCode || '',
        coordinates: draftLocation.coordinates
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save preferred location.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSaved = async () => {
    try {
      setSaving(true);
      setError(null);
      await updateUserLocation({ clear: true });
      setDraftLocation(null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to clear preferred location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00261d]/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#dbe5dc] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1ebe1]">
          <div>
            <h2 className="text-base font-bold font-display text-[#00261d]">Preferred Location</h2>
            <p className="text-[11px] text-[#717975]">
              Your exact coordinates stay private and are only used when you choose to filter nearby gear.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#ecf6ed] text-[#717975] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs">{error}</div>
        )}

        <LocationSelector
          value={draftLocation}
          label="Update Preferred Neighborhood or City"
          onSelect={(loc) => {
            setDraftLocation(loc);
            setError(null);
          }}
          onClear={() => setDraftLocation(null)}
        />

        <div className="flex items-center justify-between pt-3 border-t border-[#e1ebe1]">
          {user.preferredLocation ? (
            <button
              type="button"
              onClick={handleClearSaved}
              disabled={saving}
              className="text-xs font-semibold text-[#ba1a1a] hover:underline"
            >
              Remove Saved Location
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#c0c8c4] text-xs font-semibold text-[#414845]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !draftLocation}
              className="px-4 py-2 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
