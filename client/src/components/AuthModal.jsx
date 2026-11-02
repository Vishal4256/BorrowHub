import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('borrower'); // 'borrower' | 'lender' (admin disallowed)
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset form and mode whenever modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccessMessage(null);
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setLocation('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleTabSwitch = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccessMessage(null);

    // Frontend validation with user-friendly messages
    if (mode === 'register') {
      if (!name.trim() || !email.trim() || !password) {
        setError('Please complete all required fields.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please complete all required fields.');
        return;
      }
    }

    setSubmitting(true);

    try {
      let authUser;
      if (mode === 'login') {
        authUser = await login(email.trim(), password);
      } else {
        authUser = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          location: location.trim()
        });
      }

      setSuccessMessage(
        mode === 'login'
          ? 'Signed in successfully! Redirecting...'
          : 'Account created successfully! Redirecting...'
      );

      if (onSuccess) onSuccess(authUser);

      // Brief pause to allow user to see success state, then close modal and navigate to role dashboard
      setTimeout(() => {
        onClose();
        if (authUser?.role === 'lender') {
          navigate('/lender-dashboard');
        } else {
          navigate('/borrower-dashboard');
        }
      }, 500);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00261d]/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#dbe5dc] relative max-h-[92vh] overflow-y-auto">
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e1ebe1]">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-[#00261d] flex items-center justify-center text-[#7dfabf]">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {mode === 'login' ? 'login' : 'person_add'}
              </span>
            </span>
            <div>
              <h2 className="text-lg font-bold font-display text-[#00261d]">
                {mode === 'login' ? 'Welcome Back' : 'Join BorrowHub'}
              </h2>
              <p className="text-xs text-[#717975]">
                {mode === 'login' ? 'Sign in to access your bookings & gear' : 'Create an account to borrow or lend gear'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="w-8 h-8 rounded-full hover:bg-[#ecf6ed] text-[#717975] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 my-4 rounded-xl bg-[#e6f1e7] text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-[#00261d] shadow-2xs font-bold' : 'text-[#414845] hover:text-[#151e18]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register')}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-[#00261d] shadow-2xs font-bold' : 'text-[#414845] hover:text-[#151e18]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 bg-[#e6f1e7] border border-[#006c48]/30 rounded-xl text-xs text-[#006c48] font-semibold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-xl text-xs text-[#ba1a1a] flex items-start gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base mt-0.5">error</span>
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold text-[#151e18] mb-1">
                Full Name <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                id="auth-name"
                type="text"
                required
                disabled={submitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] focus:ring-2 focus:ring-[#006c48]/20 text-xs text-[#151e18] disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-[#151e18] mb-1">
              Email Address <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              id="auth-email"
              type="email"
              required
              disabled={submitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] focus:ring-2 focus:ring-[#006c48]/20 text-xs text-[#151e18] disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="auth-password" className="block text-xs font-semibold text-[#151e18]">
                Password <span className="text-[#ba1a1a]">*</span>
              </label>
              <span className="text-[10px] text-[#717975]">Min. 6 characters</span>
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={submitting}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] focus:ring-2 focus:ring-[#006c48]/20 text-xs text-[#151e18] disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[#717975] hover:text-[#151e18] hover:bg-[#ecf6ed] flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px] select-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#151e18] mb-1.5">Primary Role</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRole('borrower')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === 'borrower'
                        ? 'border-[#006c48] bg-[#e6f1e7] text-[#006c48] font-bold shadow-2xs'
                        : 'border-[#c0c8c4] text-[#414845] hover:border-[#8e9893]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                      <span>Borrower</span>
                    </div>
                    <span className="text-[10px] text-[#717975] font-normal block mt-0.5">Rent equipment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('lender')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === 'lender'
                        ? 'border-[#006c48] bg-[#e6f1e7] text-[#006c48] font-bold shadow-2xs'
                        : 'border-[#c0c8c4] text-[#414845] hover:border-[#8e9893]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">storefront</span>
                      <span>Lender</span>
                    </div>
                    <span className="text-[10px] text-[#717975] font-normal block mt-0.5">List & earn</span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="auth-location" className="block text-xs font-semibold text-[#151e18] mb-1">
                  Location / Neighborhood
                </label>
                <input
                  id="auth-location"
                  type="text"
                  disabled={submitting}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin, TX or Northside Campus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] focus:ring-2 focus:ring-[#006c48]/20 text-xs text-[#151e18] disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            )}
            <span>
              {submitting
                ? mode === 'login'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'login'
                ? 'Sign In to BorrowHub'
                : 'Create Account'}
            </span>
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#e1ebe1] text-center text-xs text-[#717975]">
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('register')}
                className="text-[#006c48] font-bold hover:underline cursor-pointer"
              >
                Create one now
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-[#006c48] font-bold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
