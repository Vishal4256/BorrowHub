import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-[#e6f1e7] border-t border-[#dbe5dc] mt-auto">
      <div className="w-full px-4 sm:px-6 md:px-8 py-12 max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Brand Identity & Mission */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00261d] flex items-center justify-center text-[#7dfabf]">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
              </div>
              <span className="text-2xl font-bold font-display text-[#00261d]">Borrow<span className="text-[#006c48]">Hub</span></span>
            </div>
            
            <p className="text-sm text-[#414845] max-w-sm leading-relaxed">
              Circulating resources, strengthening communities. Access high-grade equipment anytime without the burden of sole ownership.
            </p>

            <div className="flex items-center gap-2 pt-2 text-[#717975]">
              <span className="material-symbols-outlined text-sm text-[#006c48]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <span className="text-xs font-semibold tracking-wider uppercase text-[#00261d]">Protected by BorrowGuard™ Underwriting ($15,000 Guarantee)</span>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-semibold text-sm text-[#00261d] tracking-wider uppercase">Platform</h4>
            <ul className="space-y-2 text-sm text-[#414845]">
              <li>
                <Link to="/explore" className="hover:text-[#006c48] transition-colors">Equipment Marketplace</Link>
              </li>
              <li>
                <Link to="/ai-planner" className="hover:text-[#006c48] transition-colors flex items-center gap-1">
                  <span>AI Gear Planner</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#7dfabf] text-[#002113] text-[10px] font-bold">Smart</span>
                </Link>
              </li>
              <li>
                <Link to="/borrower-dashboard" className="hover:text-[#006c48] transition-colors">Active Rentals</Link>
              </li>
              <li>
                <Link to="/lender-dashboard" className="hover:text-[#006c48] transition-colors">Lender Studio</Link>
              </li>
              <li>
                <Link to="/messages" className="hover:text-[#006c48] transition-colors">Community Trust Hub</Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-semibold text-sm text-[#00261d] tracking-wider uppercase">Trust & Safety</h4>
            <ul className="space-y-2 text-sm text-[#414845]">
              <li>
                <a href="#borrowguard" className="hover:text-[#006c48] transition-colors">BorrowGuard™ Insurance</a>
              </li>
              <li>
                <a href="#id-verification" className="hover:text-[#006c48] transition-colors">Campus ID Verification</a>
              </li>
              <li>
                <a href="#smart-lockers" className="hover:text-[#006c48] transition-colors">Smart Locker Handover</a>
              </li>
              <li>
                <a href="#deposit-protection" className="hover:text-[#006c48] transition-colors">Deposit Protection Bond</a>
              </li>
              <li>
                <a href="#guidelines" className="hover:text-[#006c48] transition-colors">Community Guidelines</a>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="flex flex-col gap-3">
            <h4 className="font-display font-semibold text-sm text-[#00261d] tracking-wider uppercase">Campus & Neighborhood Digest</h4>
            <p className="text-xs text-[#414845]">Get alerts when new professional cameras and workshop tools are shared near your campus node.</p>
            <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-[#c0c8c4] shadow-xs">
              <input 
                type="email" 
                placeholder="Enter university or neighborhood email" 
                className="bg-transparent border-none text-xs text-[#151e18] placeholder:text-[#717975] focus:outline-none px-3 w-full"
              />
              <button className="bg-[#123c32] text-white rounded-full p-2 hover:bg-[#006c48] transition-colors" title="Subscribe">
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Copyright Sub-bar */}
        <div className="pt-6 border-t border-[#dbe5dc] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#414845]">
          <div>
            © 2026 BorrowHub Inc. Circulating resources, strengthening communities. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-[#006c48] font-medium">
              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span> 256-bit Encrypted
            </span>
            <span className="cursor-pointer hover:underline">Terms of Service</span>
            <span className="cursor-pointer hover:underline">Privacy Policy</span>
            <span className="cursor-pointer hover:underline">Security Audit</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
