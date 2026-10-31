import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, resolveImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LenderDashboardPage({ onOpenListItemModal, onOpenAuthModal, refreshTrigger }) {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLenderData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [items, lenderBookings] = await Promise.all([
          api.getEquipment({ lender: user.role === 'admin' ? undefined : user._id }),
          api.getBookings('lender').catch(() => [])
        ]);
        setInventory(items);
        setBookings(lenderBookings);
      } catch (err) {
        console.error('Failed to load lender dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLenderData();
  }, [user, refreshTrigger]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-5xl text-[#006c48]">storefront</span>
        <h2 className="text-xl font-bold font-display text-[#00261d]">Sign in to Lender Hub</h2>
        <p className="text-xs text-[#717975]">Manage your equipment listings, review rental requests, and track payouts.</p>
        <button
          onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
          className="px-6 py-2.5 rounded-full bg-[#006c48] text-white text-xs font-bold shadow-xs hover:bg-[#123c32] transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const pendingRequests = bookings.filter((b) => b.status === 'pending');
  const activeBookings = bookings.filter((b) => b.status === 'active' || b.status === 'approved');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  // Real earnings calculated from completed & active bookings
  const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.subtotal || b.totalPaid), 0);
  const pendingPayout = activeBookings.reduce((sum, b) => sum + (b.subtotal || b.totalPaid), 0);

  const handleApproveRequest = async (bookingId) => {
    try {
      const updated = await api.updateBookingStatus(bookingId, { status: 'approved' });
      setBookings((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
    } catch (err) {
      alert('Failed to approve request: ' + err.message);
    }
  };

  const handleDeclineRequest = async (bookingId) => {
    try {
      const updated = await api.updateBookingStatus(bookingId, {
        status: 'cancelled',
        reason: 'Declined by lender due to scheduling conflict'
      });
      setBookings((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
    } catch (err) {
      alert('Failed to decline request: ' + err.message);
    }
  };

  const handleDeleteEquipment = async (itemId) => {
    if (!confirm('Are you sure you want to delete this listing from MongoDB?')) return;
    try {
      await api.deleteEquipment(itemId);
      setInventory((prev) => prev.filter((it) => (it._id || it.id) !== itemId));
    } catch (err) {
      alert('Failed to delete equipment: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-8 bg-[#FAFBF8]">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-[#00261d]">Lender Studio & Hub</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#ecf6ed] text-[#006c48] text-xs font-bold">
              {user.role === 'lender' ? 'Host Console' : user.role === 'admin' ? 'Admin Hub' : 'Member Studio'}
            </span>
          </div>
          <p className="text-xs text-[#717975] mt-1">
            Logged in as <strong>{user.name}</strong> ({user.email})
            {user.location && <span> • {user.location}</span>}
          </p>
        </div>

        <button
          onClick={onOpenListItemModal}
          className="px-5 py-3 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>List New Gear to Database</span>
        </button>
      </div>

      {/* 4 Financial & Telemetry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Total Earned (Captured)</span>
          <div className="text-2xl font-bold font-display text-[#006c48]">${totalEarnings.toFixed(2)}</div>
          <span className="text-[10px] text-[#717975]">From completed loans</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Active / Pending Escrow</span>
          <div className="text-2xl font-bold font-display text-[#00261d]">${pendingPayout.toFixed(2)}</div>
          <span className="text-[10px] text-[#006c48] font-bold">Simulated Sandbox Escrow</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Active Gear Listings</span>
          <div className="text-2xl font-bold font-display text-[#00261d]">{inventory.length}</div>
          <span className="text-[10px] text-[#717975]">Stored in MongoDB</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-2xs">
          <span className="text-xs text-[#717975] font-semibold block mb-1">Pending Approval Requests</span>
          <div className={`text-2xl font-bold font-display ${pendingRequests.length > 0 ? 'text-[#ba1a1a]' : 'text-[#00261d]'}`}>
            {pendingRequests.length}
          </div>
          <span className="text-[10px] text-[#717975]">{pendingRequests.length > 0 ? 'Requires action' : 'Up to date'}</span>
        </div>

      </div>

      {/* 1. PENDING BORROW REQUESTS SECTION */}
      <div className="bg-white rounded-3xl border border-[#dbe5dc] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1ebe1]">
          <h2 className="font-display font-bold text-base text-[#00261d] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006c48]">notifications</span>
            <span>Pending Borrow Requests ({pendingRequests.length})</span>
          </h2>
          <span className="text-xs text-[#717975]">Incoming borrower requests for your gear</span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#717975] bg-[#FAFBF8] rounded-2xl border border-dashed border-[#dbe5dc]">
            <span className="material-symbols-outlined text-3xl text-[#006c48] mb-1">check_circle</span>
            <p className="font-bold text-[#151e18]">No pending requests</p>
            <p>New borrow requests from neighbors will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req._id || req.bookingCode}
                className="p-4 rounded-2xl border border-[#ffdea2] bg-[#fffbf2] flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#edc065] flex items-center justify-center font-bold text-xs text-[#00261d] flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl text-[#006c48]">handyman</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#00261d]">{req.equipmentTitle}</h3>
                    <p className="text-xs text-[#414845]">Borrower: <strong>{req.borrowerName}</strong> • {req.pickupDate} to {req.returnDate}</p>
                    <p className="text-[11px] text-[#006c48] font-bold mt-0.5">Rental Payout: ${req.subtotal || req.totalPaid} • Deposit Escrow: ${req.depositHeld}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveRequest(req._id)}
                    className="px-4 py-2 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Approve Request</span>
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req._id)}
                    className="px-3 py-2 rounded-full border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/40 text-xs font-bold transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. INVENTORY MANAGEMENT TABLE */}
      <div className="bg-white rounded-3xl border border-[#dbe5dc] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1ebe1]">
          <h2 className="font-display font-bold text-base text-[#00261d]">
            Your Equipment Catalog ({inventory.length} {inventory.length === 1 ? 'item' : 'items'} in MongoDB)
          </h2>
          <span className="text-xs text-[#717975]">Managed directly via REST API</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-10 bg-[#e6f1e7] rounded-xl animate-pulse"></div>
            <div className="h-10 bg-[#e6f1e7] rounded-xl animate-pulse"></div>
          </div>
        ) : inventory.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#717975] bg-[#FAFBF8] rounded-2xl border border-dashed border-[#dbe5dc] flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-[#717975]">inventory_2</span>
            <p className="font-bold text-[#151e18]">No equipment listings yet</p>
            <p className="max-w-xs">You haven't listed any equipment. Add your camera gear, workshop tools, or camping equipment to start earning.</p>
            <button
              onClick={onOpenListItemModal}
              className="mt-2 px-5 py-2 rounded-full bg-[#123c32] text-white text-xs font-bold hover:bg-[#00261d] transition-all"
            >
              List an Item Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e1ebe1] text-[#717975] uppercase text-[10px] tracking-wider font-bold">
                  <th className="pb-3">Equipment</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Daily Rate</th>
                  <th className="pb-3">Deposit</th>
                  <th className="pb-3">Mode</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2fcf2]">
                {inventory.map((item) => {
                  const itemId = item._id || item.id;
                  return (
                    <tr key={itemId} className="hover:bg-[#FAFBF8] transition-colors">
                      <td className="py-3 font-bold text-[#00261d] flex items-center gap-2">
                        <img
                          src={resolveImageUrl(item.images?.[0]) || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                        />
                        <Link to={`/equipment/${itemId}`} className="hover:underline line-clamp-1 max-w-xs">
                          {item.title}
                        </Link>
                      </td>
                      <td className="py-3 text-[#414845]">{item.category}</td>
                      <td className="py-3 text-[#717975]">{item.location}</td>
                      <td className="py-3 font-bold text-[#151e18]">${item.pricePerDay}/day</td>
                      <td className="py-3 text-[#717975]">${item.deposit || 0}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.instantBook ? 'bg-[#e6f1e7] text-[#006c48]' : 'bg-[#ffdea2]/40 text-[#463200]'
                        }`}>
                          {item.instantBook ? 'Instant Book' : 'Request Only'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <Link
                          to={`/equipment/${itemId}`}
                          className="text-[#006c48] font-bold hover:underline"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => onOpenListItemModal && onOpenListItemModal(item)}
                          className="text-[#00261d] font-bold hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment(itemId)}
                          className="text-[#ba1a1a] font-bold hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
