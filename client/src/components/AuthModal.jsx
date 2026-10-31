import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'

  // Reset form and mode whenever modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setName('');
      setEmail('');
      setPassword('');
      setLocation('');
    }
  }, [isOpen, initialMode]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('borrower'); // 'borrower' | 'lender' (admin disallowed)
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          location: location.trim()
        });
      }
      if (onSuccess) onSuccess();
      onClose();
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
            className="w-8 h-8 rounded-full hover:bg-[#ecf6ed] text-[#717975] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 my-4 rounded-xl bg-[#e6f1e7] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-[#00261d] shadow-2xs font-bold' : 'text-[#414845] hover:text-[#151e18]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-[#00261d] shadow-2xs font-bold' : 'text-[#414845] hover:text-[#151e18]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-xl text-xs text-[#ba1a1a] flex items-start gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#151e18] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#151e18] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#151e18] mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
            />
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
                        ? 'border-[#006c48] bg-[#e6f1e7] text-[#006c48] font-bold'
                        : 'border-[#c0c8c4] text-[#414845]'
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
                        ? 'border-[#006c48] bg-[#e6f1e7] text-[#006c48] font-bold'
                        : 'border-[#c0c8c4] text-[#414845]'
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
                <label className="block text-xs font-semibold text-[#151e18] mb-1">Location / Neighborhood</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin, TX or Northside Campus"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#c0c8c4] focus:outline-none focus:border-[#006c48] text-xs text-[#151e18]"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to BorrowHub' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#e1ebe1] text-center text-xs text-[#717975]">
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-[#006c48] font-bold hover:underline"
              >
                Create one now
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-[#006c48] font-bold hover:underline"
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
