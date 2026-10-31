import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ListItemModal({ isOpen, onClose, onAddItem, onOpenAuthModal, itemToEdit = null }) {
  const { user } = useAuth();

  const [title, setTitle] = useState(() => itemToEdit?.title || '');
  const [category, setCategory] = useState(() => itemToEdit?.category || 'Power Tools');
  const [pricePerDay, setPricePerDay] = useState(() => itemToEdit?.pricePerDay ?? 25);
  const [retailValue, setRetailValue] = useState(() => itemToEdit?.retailValue ?? 350);
  const [location, setLocation] = useState(() => itemToEdit?.location || user?.location || '');
  const [imageUrl, setImageUrl] = useState(() => itemToEdit?.images?.[0] || '');
  const [description, setDescription] = useState(() => itemToEdit?.description || '');
  const [condition, setCondition] = useState(() => itemToEdit?.condition || 'Like New');
  const [instantBook, setInstantBook] = useState(() => itemToEdit?.instantBook !== undefined ? itemToEdit.instantBook : true);
  const [aiPricingActive, setAiPricingActive] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Selected image exceeds the 5MB file size limit.');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);
      const res = await api.uploadImage(file);
      setImageUrl(res.url);
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  if (!isOpen) return null;

  const handleAiSuggestPrice = () => {
    setAiPricingActive(true);
    setTimeout(() => {
      const suggestedPrice = Math.max(12, Math.round(Number(retailValue || 100) * 0.05));
      setPricePerDay(suggestedPrice);
      setAiPricingActive(false);
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      onClose();
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    if (!title.trim() || !location.trim()) {
      setError('Title and location are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        category,
        pricePerDay: Number(pricePerDay),
        retailValue: Number(retailValue || 0),
        location: location.trim(),
        condition,
        instantBook,
        description: description.trim(),
        images: imageUrl.trim() ? [imageUrl.trim()] : undefined,
        deposit: Math.round(Number(pricePerDay) * 3)
      };

      let result;
      if (itemToEdit) {
        result = await api.updateEquipment(itemToEdit._id || itemToEdit.id, payload);
      } else {
        result = await api.createEquipment(payload);
      }
      if (onAddItem) onAddItem(result);
      onClose();
    } catch (err) {
      setError(err.message || (itemToEdit ? 'Failed to update equipment' : 'Failed to list equipment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00261d]/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#dbe5dc] relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e1ebe1]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#123c32] text-[#7dfabf] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-[#00261d]">
                {itemToEdit ? 'Edit Equipment Listing' : 'List Equipment for Rent'}
              </h2>
              <p className="text-xs text-[#717975]">
                {itemToEdit ? 'Update details, rates, or pickup terms in MongoDB' : 'Earn passive income while covered by BorrowGuard™ guarantee'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#ecf6ed] text-[#717975] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Unauthenticated Notice */}
        {!user && (
          <div className="mt-4 p-3 bg-[#fffbf2] border border-[#ffdea2] rounded-xl text-xs text-[#463200] flex items-center justify-between">
            <span>You must be signed in to create an equipment listing.</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuthModal) onOpenAuthModal('login');
              }}
              className="px-3 py-1 bg-[#006c48] text-white rounded-lg font-bold text-[11px]"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          
          <div>
            <label className="block text-xs font-semibold text-[#151e18] mb-1">Equipment Title</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DeWalt 20V Cordless Miter Saw"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#151e18] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18] bg-white"
              >
                <option value="Photography & Video">Photography & Video</option>
                <option value="Power Tools">Power Tools</option>
                <option value="Camping & Outdoor">Camping & Outdoor</option>
                <option value="Lawn & Garden">Lawn & Garden</option>
                <option value="Tech & Audio">Tech & Audio</option>
                <option value="Kitchen & Party">Kitchen & Party</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#151e18] mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18] bg-white"
              >
                <option value="Pristine">Pristine / Unused</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good Functional">Good Functional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#151e18] mb-1">Item Location / Neighborhood</label>
            <input 
              type="text" 
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Downtown Arts District, Austin, TX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
            />
            <span className="text-[10px] text-[#717975] mt-0.5 block">Where the borrower will pick up or meet for this item</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#151e18] mb-1">Equipment Photo (Upload or URL)</label>
            <div className="flex gap-2 items-center">
              <input 
                type="text" 
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... or choose file to upload"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
              />
              <label className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-[#ecf6ed] hover:bg-[#d5ebdd] text-[#006c48] text-xs font-bold transition-colors flex items-center gap-1.5 flex-shrink-0">
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            {imageUrl && (
              <p className="text-[10px] text-[#006c48] mt-1 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                <span className="truncate max-w-sm">Attached: {imageUrl}</span>
              </p>
            )}
          </div>

          {/* Pricing with AI Suggester */}
          <div className="p-3.5 bg-[#f2fcf2] rounded-2xl border border-[#d5ebdd] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00261d] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#006c48]">price_change</span>
                Daily Rate & Valuation
              </span>
              <button
                type="button"
                onClick={handleAiSuggestPrice}
                disabled={aiPricingActive}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#edc065] text-[#2c1e00] hover:bg-[#ffdea2]/30 text-[11px] font-semibold transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-[14px] text-[#c19841]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span>{aiPricingActive ? 'AI Calculating...' : 'AI Price Suggest'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#414845] mb-1">Daily Rental Price ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[#717975]">$</span>
                  <input 
                    type="number" 
                    min="5"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 rounded-xl bg-white border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs font-bold text-[#00261d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#414845] mb-1">Est. Retail Value ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-[#717975]">$</span>
                  <input 
                    type="number" 
                    min="20"
                    value={retailValue}
                    onChange={(e) => setRetailValue(e.target.value)}
                    className="w-full pl-6 pr-3 py-2 rounded-xl bg-white border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#151e18] mb-1">Description & Included Items</label>
            <textarea 
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what accessories are included, operating instructions, and pickup preferences..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
            ></textarea>
          </div>

          {/* Instant Book Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#ecf6ed] border border-[#dbe5dc]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006c48] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <div>
                <p className="text-xs font-bold text-[#151e18]">Enable Instant Booking</p>
                <p className="text-[11px] text-[#414845]">Verified borrowers can book without waiting for manual confirmation.</p>
              </div>
            </div>
            <input 
              type="checkbox"
              checked={instantBook}
              onChange={(e) => setInstantBook(e.target.checked)}
              className="w-4 h-4 text-[#006c48] rounded focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Action CTAs */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e1ebe1]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-[#c0c8c4] text-xs font-semibold text-[#414845] hover:bg-[#ecf6ed] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-full bg-[#123c32] hover:bg-[#006c48] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">{itemToEdit ? 'save' : 'publish'}</span>
              <span>
                {itemToEdit
                  ? (submitting ? 'Saving Changes...' : 'Save Changes')
                  : (submitting ? 'Publishing to DB...' : 'Publish Listing')}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
