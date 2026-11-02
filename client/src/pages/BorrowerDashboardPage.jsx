import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, resolveImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BorrowerDashboardPage({ onOpenAuthModal }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'pending' | 'completed'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBorrowerBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await api.getBookings('borrower');
        setBookings(data);
      } catch (err) {
        console.error('Failed to load bookings:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowerBookings();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-5xl text-[#006c48]">account_circle</span>
        <h2 className="text-xl font-bold font-display text-[#00261d]">Sign in to View Your Rentals</h2>
        <p className="text-xs text-[#717975]">Access your active reservations, locker passcodes, and return timelines.</p>
        <button
          onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
          className="px-6 py-2.5 rounded-full bg-[#006c48] text-white text-xs font-bold shadow-xs hover:bg-[#123c32] transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  // Real stats calculation from database records
  const activeBookings = bookings.filter((b) => b.status === 'active' || b.status === 'approved');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  const totalSaved = bookings.reduce((sum, b) => {
    const estRetail = b.dailyRate * 25;
    return sum + Math.max(0, estRetail - b.totalPaid);
  }, 0);

  const activeEscrow = activeBookings.reduce((sum, b) => sum + (b.depositHeld || 0), 0);

  const displayedBookings = activeTab === 'active'
    ? activeBookings
    : activeTab === 'pending'
    ? pendingBookings
    : completedBookings;

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-8 bg-[#FAFBF8]">
      
      {/* Header Profile Bar */}
      <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-[#123c32] text-white flex items-center justify-center font-bold text-xl border-2 border-[#006c48] overflow-hidden">
              {user.avatar ? (
                <img src={resolveImageUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 bg-[#006c48] text-white rounded-full p-0.5 border-2 border-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-xl text-[#00261d]">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ecf6ed] text-[#006c48] text-xs font-bold border border-[#d5ebdd]">
                {user.trustTier || 'Verified Borrower'}
              </span>
            </div>
            <p className="text-xs text-[#717975] mt-0.5">
              {user.location ? `${user.location} • ` : ''}Member Rating: {user.rating > 0 ? `${user.rating} ★` : 'New'}
            </p>
          </div>
        </div>

        {/* Quick CTA */}
        <div className="flex items-center gap-3">
          <Link
            to="/explore"
            className="px-4 py-2.5 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            <span>Browse Gear</span>
          </Link>
          <Link
            to="/ai-planner"
            className="px-4 py-2.5 rounded-full bg-[#ffdea2]/40 hover:bg-[#ffdea2]/70 border border-[#edc065] text-[#2c1e00] text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm text-[#c19841]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <span>AI Plan</span>
          </Link>
        </div>
      </div>

      {/* 4 Real Database Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Active Rentals</span>
          <div className="text-2xl font-bold font-display text-[#00261d]">{activeBookings.length}</div>
          <span className="text-[10px] text-[#006c48] font-bold">Stored in MongoDB</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Total Est. Saved</span>
          <div className="text-2xl font-bold font-display text-[#006c48]">${Math.round(totalSaved).toLocaleString()}</div>
          <span className="text-[10px] text-[#717975]">vs buying new retail</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Escrow Deposit Held</span>
          <div className="text-2xl font-bold font-display text-[#00261d]">${activeEscrow}</div>
          <span className="text-[10px] text-[#717975]">Simulated Sandbox Escrow</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Completed Loans</span>
          <div className="text-2xl font-bold font-display text-[#00261d]">{completedBookings.length}</div>
          <span className="text-[10px] text-[#006c48] font-bold">Lifetime completed</span>
        </div>

      </div>

      {/* Bookings Section */}
      <div className="bg-white rounded-3xl border border-[#dbe5dc] p-6 shadow-xs space-y-6">
        
        {/* Tab Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e1ebe1] overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'active' ? 'bg-[#123c32] text-white shadow-xs' : 'text-[#414845] hover:bg-[#ecf6ed]'
              }`}
            >
              Active & Ready ({activeBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'pending' ? 'bg-[#123c32] text-white shadow-xs' : 'text-[#414845] hover:bg-[#ecf6ed]'
              }`}
            >
              Pending Approval ({pendingBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                activeTab === 'completed' ? 'bg-[#123c32] text-white shadow-xs' : 'text-[#414845] hover:bg-[#ecf6ed]'
              }`}
            >
              Past / Completed ({completedBookings.length})
            </button>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-[#e6f1e7] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-[#717975]">inventory_2</span>
            <h3 className="text-base font-bold text-[#00261d]">No {activeTab} bookings in database</h3>
            <p className="text-xs text-[#717975] max-w-sm">
              Explore cameras, tools, and outdoor gear shared by neighbors in your area.
            </p>
            <Link
              to="/explore"
              className="mt-2 px-5 py-2.5 rounded-full bg-[#006c48] text-white text-xs font-bold hover:bg-[#123c32] transition-all"
            >
              Find Equipment Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedBookings.map((b) => (
              <div
                key={b._id || b.bookingCode}
                className="p-5 rounded-2xl border border-[#dbe5dc] hover:border-[#006c48] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAFBF8]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#e6f1e7] flex-shrink-0">
                    <img
                      src={resolveImageUrl(b.equipmentImage) || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'}
                      alt={b.equipmentTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#006c48]">#{b.bookingCode}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status === 'completed' ? 'bg-[#e6f1e7] text-[#006c48]' : 'bg-[#ffdea2]/40 text-[#463200]'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#00261d] mt-0.5">{b.equipmentTitle}</h4>
                    <p className="text-xs text-[#717975]">Lender: {b.lenderName} • Pickup: {b.pickupDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-extrabold text-[#151e18]">${b.totalPaid}</p>
                    {b.lockerPin && <p className="text-[10px] text-[#717975]">PIN: {b.lockerPin}</p>}
                  </div>
                  <Link
                    to={`/booking/${b._id || b.bookingCode}`}
                    className="px-4 py-2 rounded-full bg-[#123c32] hover:bg-[#00261d] text-white text-xs font-bold transition-all"
                  >
                    Manage / Status
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
