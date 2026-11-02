import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, resolveImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EquipmentDetailsPage({ onOpenAuthModal, onOpenListItemModal, refreshTrigger }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [pickupDate, setPickupDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(() => new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
  const [handoverOption, setHandoverOption] = useState('locker');
  const [insuranceTier] = useState('zero-deductible');

  const days = Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86400000));
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingConflictError, setBookingConflictError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getEquipmentById(id);
        setItem(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, refreshTrigger]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-lg mx-auto">
          <div className="h-64 bg-[#e6f1e7] rounded-3xl"></div>
          <div className="h-6 bg-[#dbe5dc] rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-[#dbe5dc] rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
        <h2 className="text-xl font-bold text-[#00261d]">Equipment Listing Not Found</h2>
        <p className="text-xs text-[#717975]">{error || 'This listing does not exist in the database or has been unlisted.'}</p>
        <Link to="/explore" className="px-6 py-2.5 rounded-full bg-[#123c32] text-white text-xs font-bold">
          Back to Explore
        </Link>
      </div>
    );
  }

  // Price calculations
  const basePrice = item.pricePerDay * days;
  const deliveryFee = handoverOption === 'delivery' ? 12 : 0;
  const protectionDailyRate = insuranceTier === 'zero-deductible' ? 8 : 4;
  const protectionFee = protectionDailyRate * days;
  const serviceFee = Math.round(basePrice * 0.08 * 100) / 100;
  const subtotal = Math.max(0, basePrice + deliveryFee + protectionFee + serviceFee);
  const refundableDeposit = item.deposit || 0;

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (pickupDate < todayStr) {
      setBookingConflictError('Pickup date cannot be in the past.');
      return;
    }
    if (returnDate < pickupDate) {
      setBookingConflictError('Return date must be on or after pickup date.');
      return;
    }

    setBookingConflictError(null);
    setBookingInProgress(true);

    try {
      const newBooking = await api.createBooking({
        equipmentId: item._id || item.id,
        startDate: pickupDate,
        endDate: returnDate,
        pickupDate: `${pickupDate} - 10:00 AM`,
        returnDate: `${returnDate} - 6:00 PM`
      });

      navigate(`/booking/${newBooking._id || newBooking.bookingCode}`);
    } catch (err) {
      setBookingConflictError(err.message);
    } finally {
      setBookingInProgress(false);
    }
  };

  const lenderName = item.lender?.name || item.lenderSnapshot?.name || 'Community Lender';
  const lenderAvatar = item.lender?.avatar || item.lenderSnapshot?.avatar || '';
  const lenderInitial = lenderName.charAt(0).toUpperCase();
  const lenderTrust = item.lender?.trustTier || item.lenderSnapshot?.trustTier || 'Verified Member';

  const isOwner = user && item && item.lender && (
    user._id === (item.lender._id || item.lender) ||
    user.id === (item.lender._id || item.lender)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-8">
      
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e1ebe1]">
        <nav className="flex items-center gap-2 text-xs text-[#414845]">
          <Link to="/" className="hover:text-[#006c48]">Home</Link>
          <span className="text-[#c0c8c4]">/</span>
          <Link to="/explore" className="hover:text-[#006c48]">Explore</Link>
          <span className="text-[#c0c8c4]">/</span>
          <span className="hover:text-[#006c48]">{item.category}</span>
          <span className="text-[#c0c8c4]">/</span>
          <span className="font-semibold text-[#00261d] truncate max-w-xs">{item.title}</span>
        </nav>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => onOpenListItemModal && onOpenListItemModal(item)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border border-[#006c48] text-[#006c48] hover:bg-[#ecf6ed] transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Listing</span>
            </button>
          )}
          <button
            onClick={() => setWishlistSaved(!wishlistSaved)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              wishlistSaved ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]' : 'bg-white text-[#414845] border-[#c0c8c4] hover:bg-[#ecf6ed]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: wishlistSaved ? "'FILL' 1" : "'FILL' 0" }}>
              favorite
            </span>
            <span>{wishlistSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Details (8 cols) + Right Sticky Booking Box (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================= LEFT MAIN COLUMN (8 cols) ================= */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* 1. PHOTO GALLERY SHOWCASE */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[16/10] bg-[#ecf6ed] rounded-3xl overflow-hidden shadow-sm border border-[#dbe5dc]">
              <img
                src={resolveImageUrl(item.images?.[activePhotoIdx] || item.images?.[0]) || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80'}
                alt={item.title}
                className="w-full h-full object-cover transition-all duration-300"
              />
              
              {/* Overlay Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className="bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#006c48] flex items-center gap-1 shadow-xs">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {item.location}
                </span>
                {item.instantBook && (
                  <span className="bg-[#123c32]/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#7dfabf] flex items-center gap-1 shadow-xs">
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    Instant Book
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {item.images && item.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {item.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActivePhotoIdx(idx)}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                      activePhotoIdx === idx ? 'border-[#006c48] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={resolveImageUrl(img)} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. TITLE & QUICK HIGHLIGHTS */}
          <div className="flex flex-col gap-3 pb-6 border-b border-[#e1ebe1]">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#e6f1e7] text-[#006c48] text-xs font-bold uppercase tracking-wider">
                {item.category}
              </span>
              <span className="text-xs text-[#717975]">• {item.condition}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#00261d]">
              {item.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#414845] pt-1">
              <div className="flex items-center gap-1 font-bold text-[#151e18]">
                <span className="material-symbols-outlined text-[#edc065] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                {item.reviewsCount > 0 ? (
                  <>
                    <span>{item.rating}</span>
                    <span className="text-[#717975] font-normal">({item.reviewsCount} reviews)</span>
                  </>
                ) : (
                  <span className="text-[#717975] font-normal">New listing (no reviews yet)</span>
                )}
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[#006c48] text-base">location_on</span>
                <span>{item.location}</span>
              </div>
              {item.retailValue > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-[#006c48] font-bold">
                    <span className="material-symbols-outlined text-base">verified_user</span>
                    <span>Underwritten to ${item.retailValue.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. VERIFIED LENDER CARD */}
          <div className="bg-[#FAFBF8] rounded-2xl border border-[#dbe5dc] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-[#123c32] text-white flex items-center justify-center font-bold text-lg border-2 border-white shadow-xs overflow-hidden">
                  {lenderAvatar ? (
                    <img src={resolveImageUrl(lenderAvatar)} alt={lenderName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{lenderInitial}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#006c48] text-white flex items-center justify-center text-[10px] border-2 border-white">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-[#00261d]">
                  Lender: {lenderName}
                </h3>
                <p className="text-xs text-[#006c48] font-semibold">{lenderTrust}</p>
                <p className="text-[11px] text-[#717975] mt-0.5">Location: {item.location}</p>
              </div>
            </div>

            <Link
              to="/messages"
              className="px-4 py-2 rounded-full border border-[#c0c8c4] hover:bg-white text-xs font-bold text-[#00261d] flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Message Lender</span>
            </Link>
          </div>

          {/* 4. DESCRIPTION & ACCESSORIES */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-lg text-[#00261d]">About This Equipment</h3>
            <p className="text-sm text-[#414845] leading-relaxed whitespace-pre-line">
              {item.description || 'Equipment available for community borrow.'}
            </p>

            {item.includedAccessories && item.includedAccessories.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-[#151e18] uppercase tracking-wider mb-2">Included Accessories</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#414845]">
                  {item.includedAccessories.map((acc, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#006c48]">check_circle</span>
                      <span>{acc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>

        {/* ================= RIGHT STICKY BOOKING WIDGET (4 cols) ================= */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white rounded-3xl border border-[#dbe5dc] p-6 shadow-md flex flex-col gap-5">
          
          <div className="flex items-baseline justify-between pb-4 border-b border-[#e1ebe1]">
            <div>
              <span className="text-3xl font-extrabold text-[#00261d] font-display">${item.pricePerDay}</span>
              <span className="text-xs text-[#717975]"> / day</span>
            </div>
            <span className="text-xs font-bold text-[#006c48] bg-[#e6f1e7] px-2.5 py-1 rounded-full">
              Deposit: ${refundableDeposit}
            </span>
          </div>

          {/* Conflict Error Alert */}
          {bookingConflictError && (
            <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-xs font-semibold flex items-start gap-2">
              <span className="material-symbols-outlined text-base">warning</span>
              <div>
                <p className="font-bold">Booking Request Conflict</p>
                <p className="text-[11px]">{bookingConflictError}</p>
              </div>
            </div>
          )}

          {/* Owner Management or Borrower Reservation Form */}
          {isOwner ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-[#e6f1e7] rounded-2xl border border-[#006c48]/20 text-xs text-[#00261d] space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-[#006c48]">verified</span>
                  <span>You Own This Listing</span>
                </p>
                <p className="text-[11px] text-[#414845]">
                  You cannot borrow your own equipment. Use the button below to update price, title, category, or pickup terms.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenListItemModal && onOpenListItemModal(item)}
                className="w-full py-3.5 rounded-full bg-[#123c32] hover:bg-[#006c48] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Edit Equipment Listing</span>
              </button>

              <Link
                to="/lender-dashboard"
                className="w-full py-3 rounded-full border border-[#c0c8c4] hover:bg-[#FAFBF8] text-[#151e18] text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>Open Lender Dashboard</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#717975] uppercase mb-1">Pickup Date</label>
                <input
                  type="date"
                  value={pickupDate}
                  min={todayStr}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full bg-[#FAFBF8] border border-[#c0c8c4] rounded-xl px-2.5 py-2 text-xs font-semibold text-[#151e18] focus:outline-none focus:border-[#006c48]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#717975] uppercase mb-1">Return Date</label>
                <input
                  type="date"
                  value={returnDate}
                  min={pickupDate || todayStr}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-[#FAFBF8] border border-[#c0c8c4] rounded-xl px-2.5 py-2 text-xs font-semibold text-[#151e18] focus:outline-none focus:border-[#006c48]"
                  required
                />
              </div>
            </div>

            {/* Handover Choice */}
            <div>
              <label className="block text-[11px] font-bold text-[#717975] uppercase mb-1.5">Pickup Method</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setHandoverOption('locker')}
                  className={`p-2 rounded-xl border text-left font-semibold flex flex-col justify-between ${
                    handoverOption === 'locker' ? 'border-[#006c48] bg-[#e6f1e7] text-[#006c48]' : 'border-[#c0c8c4] text-[#414845]'
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Smart Locker
                  </span>
                  <span className="text-[10px] font-normal text-[#717975]">Digital PIN pickup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHandoverOption('delivery')}
                  className={`p-2 rounded-xl border text-left font-semibold flex flex-col justify-between ${
                    handoverOption === 'delivery' ? 'border-[#006c48] bg-[#e6f1e7] text-[#006c48]' : 'border-[#c0c8c4] text-[#414845]'
                  }`}
                >
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="material-symbols-outlined text-sm">handshake</span>
                    Direct Handover
                  </span>
                  <span className="text-[10px] font-normal text-[#717975]">Meet at location</span>
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 pt-3 border-t border-[#e1ebe1] text-xs">
              <div className="flex justify-between text-[#414845]">
                <span>${item.pricePerDay} × {days} days</span>
                <span className="font-semibold text-[#151e18]">${basePrice}</span>
              </div>

              <div className="flex justify-between text-[#414845]">
                <span>BorrowGuard™ Underwriting</span>
                <span className="font-semibold text-[#151e18]">${protectionFee}</span>
              </div>

              <div className="flex justify-between text-[#414845]">
                <span>Platform Service Fee (8%)</span>
                <span className="font-semibold text-[#151e18]">${serviceFee}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-[#00261d] pt-2 border-t border-[#e1ebe1]">
                <span>Total Escrow Hold (Simulated)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <p className="text-[10px] text-[#717975] leading-tight pt-1">
                Note: Payment authorization is simulated in test sandbox. Real MongoDB booking record will be created.
              </p>
            </div>

            {/* Submit Reservation */}
            <button
              type="submit"
              disabled={bookingInProgress}
              className="w-full py-3.5 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {bookingInProgress ? (
                <span>Submitting to Database...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  <span>{user ? 'Reserve & Generate Booking' : 'Sign In to Reserve Equipment'}</span>
                </>
              )}
            </button>
          </form>
          )}

        </aside>

      </div>

    </div>
  );
}
