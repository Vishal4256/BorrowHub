import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../services/api';

export default function Navbar({ onOpenListItemModal, onOpenAuthModal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  const handleListGearClick = () => {
    if (!user) {
      if (onOpenAuthModal) onOpenAuthModal('login');
      return;
    }
    if (onOpenListItemModal) onOpenListItemModal();
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="bg-surface border-b border-[#e1ebe1] shadow-xs top-0 sticky z-50 transition-all bg-[#FAFBF8]">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-8 max-w-7xl mx-auto h-20">
        
        {/* Brand & Search Left */}
        <div className="flex items-center gap-4 lg:gap-8 flex-1">
          <Link to="/" className="text-2xl font-bold text-[#00261d] tracking-tight flex items-center gap-2 group">
            <span className="w-9 h-9 rounded-full bg-[#00261d] flex items-center justify-center text-[#7dfabf] shadow-xs group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>sync_saved_locally</span>
            </span>
            <span className="font-display font-extrabold text-[#00261d]">Borrow<span className="text-[#006c48]">Hub</span></span>
          </Link>

          {/* Quick Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-72">
            <span className="material-symbols-outlined absolute left-3.5 text-[#717975] text-[20px]">search</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cameras, tools, tents..."
              className="w-full bg-[#ffffff] border border-[#c0c8c4] rounded-full pl-10 pr-4 py-2 text-sm text-[#151e18] placeholder:text-[#717975] focus:outline-none focus:border-[#006c48] focus:ring-2 focus:ring-[#006c48]/20 transition-all shadow-2xs"
            />
          </form>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <Link
            to="/explore"
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              isActive('/explore')
                ? 'bg-[#e6f1e7] text-[#006c48]'
                : 'text-[#414845] hover:text-[#151e18] hover:bg-[#ecf6ed]'
            }`}
          >
            Explore
          </Link>

          <Link
            to="/ai-planner"
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isActive('/ai-planner')
                ? 'bg-[#123c32] text-white shadow-xs'
                : 'bg-[#ffdea2]/40 text-[#00261d] border border-[#edc065] hover:bg-[#ffdea2]/70'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-[#c19841]">auto_awesome</span>
            <span>AI Rig Planner</span>
          </Link>

          <Link
            to="/borrower-dashboard"
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              isActive('/borrower-dashboard')
                ? 'bg-[#e6f1e7] text-[#006c48]'
                : 'text-[#414845] hover:text-[#151e18] hover:bg-[#ecf6ed]'
            }`}
          >
            My Rentals
          </Link>

          <Link
            to="/lender-dashboard"
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
              isActive('/lender-dashboard')
                ? 'bg-[#e6f1e7] text-[#006c48]'
                : 'text-[#414845] hover:text-[#151e18] hover:bg-[#ecf6ed]'
            }`}
          >
            Lender Hub
          </Link>
        </nav>

        {/* Action Controls Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* List Item CTA Button */}
          <button
            onClick={handleListGearClick}
            className="hidden sm:inline-flex items-center gap-2 bg-[#123c32] hover:bg-[#00261d] text-white px-4 py-2 rounded-full font-semibold text-xs lg:text-sm shadow-xs hover:shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>List Gear</span>
          </button>

          {/* Messages Link Icon */}
          <Link
            to="/messages"
            className="p-2 text-[#414845] hover:text-[#151e18] hover:bg-[#e6f1e7] rounded-full transition-colors relative"
            title="Community Messages"
          >
            <span className="material-symbols-outlined text-[22px]">chat</span>
          </Link>

          {/* User Profile / Auth State */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-1 p-1 rounded-full hover:bg-[#e6f1e7] transition-all group"
                title="Account Menu"
              >
                <div className="w-9 h-9 rounded-full bg-[#123c32] text-white flex items-center justify-center font-bold text-sm border-2 border-[#006c48] overflow-hidden shadow-xs">
                  {user.avatar ? (
                    <img src={resolveImageUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-bold text-[#151e18] leading-tight flex items-center gap-1">
                    {user.name}
                    <span className="material-symbols-outlined text-[14px] text-[#006c48]">verified</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#006c48]">
                    {user.role === 'lender' ? 'Lender' : user.role === 'admin' ? 'Admin' : 'Borrower'}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-[#717975]">arrow_drop_down</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#e1ebe1] p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="pb-3 border-b border-[#e1ebe1]">
                    <p className="text-xs text-[#717975] uppercase font-bold tracking-wider">Signed In Account</p>
                    <p className="font-bold text-[#151e18] text-sm mt-0.5">{user.name}</p>
                    <p className="text-xs text-[#006c48] font-medium truncate">{user.email}</p>
                    {user.location && (
                      <p className="text-[11px] text-[#717975] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">location_on</span>
                        <span>{user.location}</span>
                      </p>
                    )}
                  </div>

                  <div className="py-2 space-y-1">
                    <Link
                      to="/borrower-dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#151e18] hover:bg-[#f2fcf2] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#006c48]">inventory_2</span>
                      <span>My Rentals</span>
                    </Link>

                    <Link
                      to="/lender-dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#151e18] hover:bg-[#f2fcf2] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#006c48]">storefront</span>
                      <span>Lender Studio</span>
                    </Link>

                    <Link
                      to="/messages"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#151e18] hover:bg-[#f2fcf2] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#006c48]">chat</span>
                      <span>Community Messages</span>
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-[#e1ebe1]">
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#00261d] hover:bg-[#ecf6ed] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuthModal && onOpenAuthModal('register')}
                className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#006c48] hover:bg-[#123c32] text-white shadow-xs transition-all active:scale-95"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#414845] hover:bg-[#e6f1e7] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e1ebe1] bg-[#FAFBF8] px-4 py-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 text-[#717975] text-[20px]">search</span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search equipment..."
              className="w-full bg-white border border-[#c0c8c4] rounded-full pl-10 pr-4 py-2 text-sm text-[#151e18]"
            />
          </form>

          <div className="flex flex-col gap-1 pt-2">
            <Link
              to="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#151e18] hover:bg-[#e6f1e7] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-[#006c48]">explore</span>
              <span>Explore Marketplace</span>
            </Link>

            <Link
              to="/ai-planner"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#00261d] bg-[#ffdea2]/30 border border-[#edc065] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-[#c19841]">auto_awesome</span>
              <span>AI Rig Planner</span>
            </Link>

            <Link
              to="/borrower-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#151e18] hover:bg-[#e6f1e7] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-[#006c48]">inventory_2</span>
              <span>My Rentals</span>
            </Link>

            <Link
              to="/lender-dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#151e18] hover:bg-[#e6f1e7] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-[#006c48]">storefront</span>
              <span>Lender Dashboard</span>
            </Link>

            <Link
              to="/messages"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#151e18] hover:bg-[#e6f1e7] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-[#006c48]">chat</span>
              <span>Community & Messaging</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleListGearClick();
              }}
              className="w-full mt-2 px-4 py-3 bg-[#123c32] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>List an Item for Rent</span>
            </button>

            {!user && (
              <div className="pt-2 border-t border-[#e1ebe1] grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal('login');
                  }}
                  className="py-2.5 rounded-xl border border-[#c0c8c4] text-xs font-bold text-[#00261d]"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal('register');
                  }}
                  className="py-2.5 rounded-xl bg-[#006c48] text-white text-xs font-bold"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
