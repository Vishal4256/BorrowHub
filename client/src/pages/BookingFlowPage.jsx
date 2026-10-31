import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, resolveImageUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BookingFlowPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getBookingById(id);
        setBooking(data);
      } catch (err) {
        setError(err.message || 'Booking not found');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handleUpdateStatus = async (newStatus, reason) => {
    if (!booking) return;
    try {
      setActionInProgress(true);
      const updated = await api.updateBookingStatus(booking._id, {
        status: newStatus,
        reason,
        conditionScanProof: photoUploaded ? 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32' : undefined
      });
      setBooking(updated);
    } catch (err) {
      alert('Status update failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4 max-w-lg mx-auto">
          <div className="h-40 bg-[#e6f1e7] rounded-3xl"></div>
          <div className="h-6 bg-[#dbe5dc] rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <span className="material-symbols-outlined text-5xl text-[#ba1a1a]">error</span>
        <h2 className="text-xl font-bold text-[#00261d]">Booking Record Not Found</h2>
        <p className="text-xs text-[#717975]">{error || 'No booking matching this code exists in the database.'}</p>
        <Link to="/borrower-dashboard" className="px-6 py-2.5 rounded-full bg-[#123c32] text-white text-xs font-bold">
          Go to My Rentals
        </Link>
      </div>
    );
  }

  const currentState = booking.status;
  const isLender = user && (booking.lender?._id === user._id || booking.lender === user._id || user.role === 'admin');
  const isBorrower = user && (booking.borrower?._id === user._id || booking.borrower === user._id);

  return (
    <div className="flex flex-col min-h-screen pb-16 bg-[#FAFBF8]">
      
      {/* Top Banner Bar */}
      <section className="bg-white border-b border-[#e1ebe1] py-3 sticky top-20 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <Link to={isLender ? "/lender-dashboard" : "/borrower-dashboard"} className="p-1 hover:bg-[#ecf6ed] rounded-lg text-[#717975] transition-colors">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-base text-[#00261d]">Booking Hub — #{booking.bookingCode}</h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  currentState === 'completed' ? 'bg-[#e6f1e7] text-[#006c48]' :
                  currentState === 'cancelled' ? 'bg-[#ffdad6] text-[#ba1a1a]' :
                  'bg-[#ffdea2]/40 text-[#463200]'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
                  Status: {currentState.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#717975]">{booking.equipmentTitle} • {booking.lockerLocation || 'Designated Pickup Location'}</p>
            </div>
          </div>

          {/* Role-Aware Action Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {currentState === 'pending' && isLender && (
              <button
                disabled={actionInProgress}
                onClick={() => handleUpdateStatus('approved')}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#006c48] text-white flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Approve Request (Lender)
              </button>
            )}

            {currentState === 'approved' && isBorrower && (
              <button
                disabled={actionInProgress}
                onClick={() => handleUpdateStatus('active')}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#006c48] text-white flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">key</span>
                Confirm Gear Picked Up
              </button>
            )}

            {currentState === 'active' && (isBorrower || isLender) && (
              <button
                disabled={actionInProgress}
                onClick={() => handleUpdateStatus('completed')}
                className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#123c32] text-white flex items-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">task_alt</span>
                Complete Return
              </button>
            )}
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-8">
        
        {/* Stage Timeline Stepper */}
        <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            
            <div className={`flex items-center gap-3 ${currentState !== 'pending' ? 'text-[#006c48]' : 'text-[#00261d]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                currentState !== 'pending' ? 'bg-[#006c48] text-white' : 'bg-[#123c32] text-white ring-4 ring-[#7dfabf]/40'
              }`}>
                {currentState !== 'pending' ? <span className="material-symbols-outlined text-base">check</span> : '1'}
              </div>
              <div className="text-xs">
                <span className="font-bold block">1. Request Placed</span>
                <span className="text-[#717975] text-[11px]">{booking.pickupDate}</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${currentState === 'active' || currentState === 'completed' ? 'text-[#006c48]' : currentState === 'approved' ? 'text-[#00261d]' : 'text-[#717975]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                currentState === 'active' || currentState === 'completed'
                  ? 'bg-[#006c48] text-white' 
                  : currentState === 'approved' 
                    ? 'bg-[#123c32] text-white ring-4 ring-[#7dfabf]/40' 
                    : 'bg-[#e6f1e7] text-[#717975]'
              }`}>
                {currentState === 'active' || currentState === 'completed' ? <span className="material-symbols-outlined text-base">check</span> : '2'}
              </div>
              <div className="text-xs">
                <span className="font-bold block">2. Locker Passcode</span>
                <span className="text-[#717975] text-[11px]">
                  {currentState === 'pending' ? 'Generated upon approval' : `PIN: ${booking.lockerPin || '****'}`}
                </span>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${currentState === 'completed' ? 'text-[#006c48]' : currentState === 'active' ? 'text-[#00261d]' : 'text-[#717975]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                currentState === 'completed'
                  ? 'bg-[#006c48] text-white' 
                  : currentState === 'active' 
                    ? 'bg-[#123c32] text-white ring-4 ring-[#7dfabf]/40' 
                    : 'bg-[#e6f1e7] text-[#717975]'
              }`}>
                {currentState === 'completed' ? <span className="material-symbols-outlined text-base">check</span> : '3'}
              </div>
              <div className="text-xs">
                <span className="font-bold block">3. In Active Use</span>
                <span className="text-[#717975] text-[11px]">{booking.returnDate}</span>
              </div>
            </div>

            <div className={`flex items-center gap-3 ${currentState === 'completed' ? 'text-[#006c48]' : 'text-[#717975]'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                currentState === 'completed' ? 'bg-[#006c48] text-white' : 'bg-[#e6f1e7] text-[#717975]'
              }`}>
                {currentState === 'completed' ? <span className="material-symbols-outlined text-base">check</span> : '4'}
              </div>
              <div className="text-xs">
                <span className="font-bold block">4. Return & Deposit Release</span>
                <span className="text-[#717975] text-[11px]">{currentState === 'completed' ? 'Deposit Released' : 'Pending Return'}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic 2-Panel Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ================= LEFT MAIN STATUS CARD (7 cols) ================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* STATE 1: PENDING LENDER APPROVAL */}
            {currentState === 'pending' && (
              <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#ffdea2]/30 text-[#463200] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-[#00261d]">
                      {isLender ? 'Action Required: Confirm Borrow Request' : `Awaiting ${booking.lenderName}'s Confirmation`}
                    </h2>
                    <p className="text-xs text-[#717975]">
                      {isLender
                        ? `${booking.borrowerName} has requested to borrow this gear. Review and confirm dates below.`
                        : 'The lender will review your request. Escrow hold is simulated in prototype mode.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#f2fcf2] rounded-2xl border border-[#d5ebdd] space-y-2 text-xs">
                  <span className="font-bold text-[#006c48] block">Next steps upon lender approval:</span>
                  <p className="text-[#414845]">1. Digital locker passcode is issued to the borrower.</p>
                  <p className="text-[#414845]">2. Handover point: {booking.lockerLocation}.</p>
                </div>

                <div className="flex gap-3">
                  {isLender ? (
                    <>
                      <button
                        disabled={actionInProgress}
                        onClick={() => handleUpdateStatus('approved')}
                        className="flex-1 py-3 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-all shadow-xs"
                      >
                        Approve Request →
                      </button>
                      <button
                        disabled={actionInProgress}
                        onClick={() => handleUpdateStatus('cancelled', 'Declined by lender')}
                        className="px-4 py-3 rounded-full border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/30 text-xs font-bold transition-all"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={actionInProgress}
                      onClick={() => handleUpdateStatus('cancelled', 'Cancelled by borrower')}
                      className="px-4 py-3 rounded-full border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]/30 text-xs font-bold transition-all"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STATE 2: APPROVED & READY FOR PICKUP */}
            {currentState === 'approved' && (
              <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#ecf6ed] text-[#006c48] flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg text-[#00261d]">Booking Approved! Locker Passcode Ready</h2>
                      <p className="text-xs text-[#717975]">Handover Point: {booking.lockerLocation}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#ecf6ed] text-[#006c48] text-xs font-bold">Approved</span>
                </div>

                {/* Locker Code Display */}
                <div className="p-5 bg-gradient-to-r from-[#123c32] to-[#00261d] text-white rounded-2xl text-center space-y-2">
                  <span className="text-[11px] text-[#7dfabf] font-semibold uppercase tracking-wider">
                    Digital Smart Locker Passcode (Prototype Simulation)
                  </span>
                  <div className="text-4xl font-mono font-bold tracking-widest text-[#7dfabf]">
                    {booking.lockerPin || '----'}
                  </div>
                  <p className="text-xs text-[#c0ecdd]">
                    (Simulated Smart Locker Integration • Enter PIN on digital locker to retrieve gear)
                  </p>
                </div>

                {isBorrower && (
                  <button
                    disabled={actionInProgress}
                    onClick={() => handleUpdateStatus('active')}
                    className="w-full py-3.5 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">key</span>
                    <span>Confirm Gear Retrieved (Set to Active Rental)</span>
                  </button>
                )}
              </div>
            )}

            {/* STATE 3: ACTIVE IN-USE */}
            {currentState === 'active' && (
              <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#ecf6ed] rounded-2xl border border-[#d5ebdd]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#006c48] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                    <div>
                      <h3 className="font-bold text-sm text-[#00261d]">Gear is In Active Use</h3>
                      <p className="text-xs text-[#414845]">Return due: <strong>{booking.returnDate}</strong></p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#006c48] text-white text-xs font-bold">Active Loan</span>
                </div>

                {/* Return Handover Checklist */}
                <div className="space-y-3">
                  <h3 className="font-display font-bold text-sm text-[#00261d]">Pre-Return Checklist</h3>
                  <div className="space-y-2 text-xs">
                    {booking.handoverChecklist && booking.handoverChecklist.map((check, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#f2fcf2] border border-[#d5ebdd]">
                        <span className="font-semibold text-[#151e18] flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-[#006c48]">check</span>
                          {check.item}
                        </span>
                        <span className="text-[10px] text-[#006c48] font-bold">Required</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo Condition Verification (Prototype Simulation) */}
                <div className="p-4 bg-[#FAFBF8] rounded-2xl border border-[#c0c8c4] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00261d] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#006c48]">photo_camera</span>
                      <span>Return Condition Inspection (Prototype Feature)</span>
                    </span>
                    <span className="text-[10px] text-[#717975]">Prototype Simulation</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPhotoUploaded(true)}
                    className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      photoUploaded ? 'bg-[#e6f1e7] text-[#006c48] border-[#006c48]' : 'bg-white border-[#c0c8c4] text-[#414845] hover:bg-[#ecf6ed]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{photoUploaded ? 'check_circle' : 'upload_file'}</span>
                    <span>{photoUploaded ? 'Inspection Photo Attached' : 'Attach Condition Photo (Simulated)'}</span>
                  </button>
                </div>

                <button
                  disabled={actionInProgress}
                  onClick={() => handleUpdateStatus('completed')}
                  className="w-full py-3.5 rounded-full bg-[#123c32] hover:bg-[#00261d] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">lock</span>
                  <span>Confirm Return & Release Simulated Escrow Deposit</span>
                </button>
              </div>
            )}

            {/* STATE 4: COMPLETED */}
            {currentState === 'completed' && (
              <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#ecf6ed] text-[#006c48] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">verified</span>
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-[#00261d]">Rental Completed Successfully!</h2>
                    <p className="text-xs text-[#717975]">Gear safely returned. Security deposit escrow of ${booking.depositHeld} released.</p>
                  </div>
                </div>

                <div className="p-4 bg-[#f2fcf2] rounded-2xl border border-[#d5ebdd] space-y-1 text-xs">
                  <p className="font-bold text-[#006c48]">Inspection Status:</p>
                  <p className="text-[#414845]">{booking.conditionScan?.notes || 'Clean return verified. Record persisted in MongoDB.'}</p>
                </div>

                <Link
                  to={isLender ? "/lender-dashboard" : "/borrower-dashboard"}
                  className="w-full py-3 rounded-full bg-[#006c48] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Return to Dashboard</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            )}

            {/* STATE 5: CANCELLED */}
            {currentState === 'cancelled' && (
              <div className="bg-white rounded-3xl p-6 border border-[#ba1a1a]/30 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">cancel</span>
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg text-[#ba1a1a]">Booking Cancelled</h2>
                    <p className="text-xs text-[#717975]">{booking.cancellationReason || 'This booking has been cancelled.'}</p>
                  </div>
                </div>

                <div className="p-4 bg-[#ffdad6]/30 rounded-2xl border border-[#ba1a1a]/20 text-xs text-[#414845]">
                  Escrow hold of ${booking.totalPaid} has been voided.
                </div>
              </div>
            )}

          </div>

          {/* ================= RIGHT SIDE SUMMARY CARD (5 cols) ================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Gear Summary Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#dbe5dc] shadow-xs space-y-4">
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[#e6f1e7] flex-shrink-0">
                  <img
                    src={resolveImageUrl(booking.equipmentImage) || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'}
                    alt={booking.equipmentTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#00261d] line-clamp-2">{booking.equipmentTitle}</h3>
                  <p className="text-xs text-[#006c48] font-bold mt-1">${booking.dailyRate}/day • {booking.days} days</p>
                  <p className="text-[11px] text-[#717975]">Lender: {booking.lenderName}</p>
                </div>
              </div>

              {/* Payment Telemetry Breakdown */}
              <div className="space-y-2 pt-3 border-t border-[#e1ebe1] text-xs">
                <div className="flex justify-between text-[#414845]">
                  <span>Rental Subtotal ({booking.days} days)</span>
                  <span className="font-semibold text-[#151e18]">${booking.subtotal || booking.dailyRate * booking.days}</span>
                </div>
                <div className="flex justify-between text-[#414845]">
                  <span>BorrowGuard™ Underwriting Fee</span>
                  <span className="font-semibold text-[#151e18]">${booking.insuranceFee || 5.0}</span>
                </div>
                <div className="flex justify-between text-[#414845]">
                  <span>Platform Fee (8%)</span>
                  <span className="font-semibold text-[#151e18]">${booking.serviceFee || 0}</span>
                </div>
                <div className="flex justify-between text-[#414845]">
                  <span>Refundable Escrow Deposit</span>
                  <span className="font-semibold text-[#006c48]">${booking.depositHeld} (Held)</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#00261d] pt-2 border-t border-[#e1ebe1]">
                  <span>Total Escrow Hold</span>
                  <span>${booking.totalPaid}</span>
                </div>

                <div className="pt-2 text-[10px] text-[#717975]">
                  Payment Status: <strong className="text-[#006c48]">{booking.paymentStatus}</strong>
                  <br />
                  <span>(Prototype Sandbox Escrow Hold)</span>
                </div>
              </div>
            </div>

            {/* Direct Messaging Shortcut */}
            <div className="bg-[#FAFBF8] rounded-2xl p-4 border border-[#dbe5dc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c48]">chat</span>
                <span className="text-xs font-bold text-[#151e18]">Questions about this booking?</span>
              </div>
              <Link to="/messages" className="text-xs font-bold text-[#006c48] hover:underline">
                Open Chat →
              </Link>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
