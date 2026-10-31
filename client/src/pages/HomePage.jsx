import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EquipmentCard from '../components/EquipmentCard';
import { api } from '../services/api';
import { categoriesList } from '../data/equipmentData';

export default function HomePage({ onOpenListItemModal, refreshTrigger }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [equipment, setEquipment] = useState([]);
  const [stats, setStats] = useState({
    totalEquipment: 0,
    totalUsers: 0,
    totalBookings: 0,
    totalCommunitySavings: 0,
    co2SavedKg: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [items, statsData] = await Promise.all([
          api.getEquipment(),
          api.getStats().catch(() => ({
            totalEquipment: 0,
            totalUsers: 0,
            totalBookings: 0,
            totalCommunitySavings: 0,
            co2SavedKg: 0
          }))
        ]);
        setEquipment(items);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load homepage data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  // Extract unique locations dynamically from database items
  const dynamicLocations = useMemo(() => {
    const locSet = new Set();
    equipment.forEach((item) => {
      if (item.location) locSet.add(item.location.trim());
    });
    return Array.from(locSet);
  }, [equipment]);

  const filteredEquipment = selectedCategory === 'all'
    ? equipment
    : equipment.filter((item) => item.category === selectedCategory);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (searchLocation.trim()) params.append('location', searchLocation.trim());
    const qs = params.toString();
    navigate(`/explore${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="flex flex-col gap-16 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Eco Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ecf6ed] border border-[#c0c8c4]/60 w-fit">
              <span className="material-symbols-outlined text-[#006c48] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <span className="text-xs font-semibold text-[#414845]">Share More. Waste Less. • Community & Neighborhood Verified</span>
            </div>

            {/* Hero Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-[#00261d] tracking-tight leading-[1.1]">
              Borrow More.<br />
              Buy Less. <span className="text-[#006c48] underline decoration-[#7dfabf] decoration-wavy decoration-3">Share Better.</span>
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg text-[#414845] max-w-xl leading-relaxed">
              Access cinema cameras, heavy-duty power tools, camping rigs, and appliances from verified neighbors. Save money while shrinking your environmental footprint through circular community sharing.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <span>Explore Equipment</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>

              <button
                onClick={onOpenListItemModal}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#c0c8c4] hover:border-[#00261d] text-[#00261d] font-semibold text-sm shadow-xs transition-all active:scale-95"
              >
                <span>Lend an Item</span>
                <span className="material-symbols-outlined text-lg">add_circle</span>
              </button>

              <Link
                to="/ai-planner"
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-[#ffdea2]/40 border border-[#edc065] text-[#2c1e00] hover:bg-[#ffdea2]/70 text-xs sm:text-sm font-bold transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-base text-[#c19841]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span>AI Rig Planner</span>
              </Link>
            </div>

            {/* Trust Bar with Real Database Metrics */}
            <div className="pt-4 border-t border-[#dbe5dc] flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#123c32] text-[#7dfabf] flex items-center justify-center font-bold text-xs">
                  {stats.totalEquipment}
                </span>
                <div className="text-xs text-[#414845]">
                  <p className="font-bold text-[#151e18] leading-tight">
                    {stats.totalEquipment} {stats.totalEquipment === 1 ? 'item' : 'items'} available
                  </p>
                  <p className="text-[11px] text-[#717975]">{stats.totalUsers} registered community members</p>
                </div>
              </div>

              {stats.totalCommunitySavings > 0 ? (
                <div className="text-xs text-[#414845] border-l border-[#dbe5dc] pl-6">
                  <div className="flex items-center gap-1 font-bold text-[#151e18]">
                    <span className="material-symbols-outlined text-[#006c48] text-base">savings</span>
                    <span>${stats.totalCommunitySavings.toLocaleString()} saved across {stats.totalBookings} rentals</span>
                  </div>
                  <span className="text-[11px] text-[#717975]">Backed by BorrowGuard™ Underwriting</span>
                </div>
              ) : (
                <div className="text-xs text-[#414845] border-l border-[#dbe5dc] pl-6">
                  <div className="flex items-center gap-1 font-bold text-[#006c48]">
                    <span className="material-symbols-outlined text-[#006c48] text-base">verified_user</span>
                    <span>100% Peer Protected by BorrowGuard™</span>
                  </div>
                  <span className="text-[11px] text-[#717975]">Zero-deductible community safety guarantee</span>
                </div>
              )}
            </div>

          </div>

          {/* Hero Right Column: Bento Dynamic Collage */}
          <div className="lg:col-span-5 relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#7dfabf]/30 to-[#ffdea2]/30 rounded-3xl filter blur-2xl -z-10 opacity-70"></div>
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* Bento Card 1: Featured Gear or Clean Empty CTA */}
              {equipment.length > 0 ? (
                <Link
                  to={`/equipment/${equipment[0]._id || equipment[0].id}`}
                  className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="relative rounded-xl overflow-hidden mb-3 aspect-square bg-[#e6f1e7]">
                    <img 
                      src={equipment[0].images?.[0] || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'} 
                      alt={equipment[0].title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {equipment[0].location && (
                      <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold text-[#006c48] flex items-center gap-0.5 max-w-[80%] truncate">
                        <span className="material-symbols-outlined text-xs flex-shrink-0">location_on</span>
                        <span className="truncate">{equipment[0].location}</span>
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#006c48] uppercase tracking-wider">{equipment[0].category}</span>
                    <h4 className="text-xs font-bold text-[#00261d] line-clamp-1">{equipment[0].title}</h4>
                    <p className="text-sm font-extrabold text-[#151e18] mt-1">${equipment[0].pricePerDay}<span className="text-[10px] font-normal text-[#717975]">/day</span></p>
                  </div>
                </Link>
              ) : (
                <div className="bg-white rounded-2xl p-4 border border-[#dbe5dc] shadow-sm flex flex-col justify-between">
                  <div className="rounded-xl aspect-square bg-[#e6f1e7] flex flex-col items-center justify-center p-3 text-center">
                    <span className="material-symbols-outlined text-3xl text-[#006c48] mb-1">add_circle</span>
                    <span className="text-xs font-bold text-[#00261d]">List the First Item</span>
                    <p className="text-[10px] text-[#717975] mt-1">Start lending gear in your local neighborhood node.</p>
                  </div>
                  <button
                    onClick={onOpenListItemModal}
                    className="mt-2 py-1.5 bg-[#006c48] hover:bg-[#123c32] text-white rounded-xl text-center text-xs font-bold transition-colors"
                  >
                    List Gear
                  </button>
                </div>
              )}

              {/* Bento Card 2: AI Rig Matching Widget */}
              <div className="bg-[#123c32] rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between border border-[#7dfabf]/20">
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-white/10 text-[#7dfabf]">
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#7dfabf]">AI Engine</span>
                </div>
                <div className="my-3">
                  <h4 className="text-xs font-bold">Smart Compatibility</h4>
                  <p className="text-[11px] text-[#c0ecdd] mt-1 line-clamp-3">
                    Calculates voltage matching, battery runtimes, and local pickup availability.
                  </p>
                </div>
                <Link to="/ai-planner" className="w-full py-2 bg-[#7dfabf] hover:bg-[#6be0a8] text-[#00261d] rounded-xl text-center text-xs font-bold transition-colors">
                  Try AI Planner
                </Link>
              </div>

              {/* Bento Card 3: Live Community Node */}
              <div className="col-span-2 bg-[#00261d] rounded-2xl p-4 text-white flex items-center justify-between border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#006c48] flex items-center justify-center text-[#7dfabf]">
                    <span className="material-symbols-outlined">hub</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Community Gear Hub</h4>
                    <p className="text-[11px] text-[#c0ecdd]">{equipment.length} verified listings in database</p>
                  </div>
                </div>
                <Link to="/explore" className="text-xs font-bold text-[#7dfabf] hover:underline flex items-center gap-0.5">
                  Browse Hub <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 2. SEARCH & DYNAMIC LOCATION NAVIGATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 w-full">
        
        {/* Interactive Search Bar Widget */}
        <form onSubmit={handleSearchSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-[#dbe5dc] mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Search query input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b md:border-b-0 md:border-r border-[#e1ebe1]">
              <span className="material-symbols-outlined text-[#006c48]">search</span>
              <div className="w-full">
                <label className="block text-[10px] font-bold text-[#717975] uppercase">What do you need?</label>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Cinema rig, hammer drill, tent"
                  className="w-full text-xs font-medium text-[#151e18] placeholder:text-[#717975] focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Hub / Location Input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b md:border-b-0 md:border-r border-[#e1ebe1]">
              <span className="material-symbols-outlined text-[#006c48]">location_on</span>
              <div className="w-full">
                <label className="block text-[10px] font-bold text-[#717975] uppercase">Location / Area</label>
                <input
                  type="text"
                  list="homepage-locations"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder={dynamicLocations.length > 0 ? "All Locations or enter area..." : "Enter your city/neighborhood..."}
                  className="w-full text-xs font-semibold text-[#151e18] placeholder:text-[#717975] focus:outline-none"
                />
                {dynamicLocations.length > 0 && (
                  <datalist id="homepage-locations">
                    {dynamicLocations.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>

            {/* Timing */}
            <div className="flex items-center gap-2 px-3 py-2 border-b md:border-b-0 md:border-r border-[#e1ebe1]">
              <span className="material-symbols-outlined text-[#006c48]">calendar_today</span>
              <div className="w-full">
                <label className="block text-[10px] font-bold text-[#717975] uppercase">Flexible Schedule</label>
                <span className="text-xs font-semibold text-[#151e18]">Daily & Multi-day Rental</span>
              </div>
            </div>

            {/* Search Button */}
            <div>
              <button 
                type="submit"
                className="w-full py-3 rounded-xl bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-base">filter_list</span>
                <span>Find Near Me</span>
              </button>
            </div>

          </div>
        </form>

        {/* Category Horizontal Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-[#123c32] text-white shadow-xs'
                  : 'bg-white text-[#414845] border border-[#dbe5dc] hover:bg-[#ecf6ed] hover:border-[#006c48]/30'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

      </section>

      {/* 3. FEATURED EQUIPMENT SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-[#00261d]">Available Equipment</h2>
            <p className="text-xs text-[#717975] mt-0.5">
              Real equipment listings stored in MongoDB, ready for community borrow
            </p>
          </div>
          <Link to="/explore" className="text-xs font-bold text-[#006c48] hover:underline flex items-center gap-1">
            <span>View All ({equipment.length})</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-[#e1ebe1]"></div>
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#c0c8c4] p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-[#717975]">inventory_2</span>
            <h3 className="text-base font-bold text-[#151e18]">No equipment listings yet</h3>
            <p className="text-xs text-[#717975] max-w-sm">
              BorrowHub starts clean. Be the first to list your tools, cameras, or outdoor gear for your community.
            </p>
            <button
              onClick={onOpenListItemModal}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#123c32] text-white text-xs font-bold hover:bg-[#00261d] transition-all"
            >
              List an Item Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredEquipment.map((item) => (
              <EquipmentCard key={item._id || item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 4. AI ASSISTANT SPOTLIGHT PROMO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 w-full">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#123c32] to-[#00261d] text-white p-8 md:p-12 overflow-hidden shadow-xl border border-[#c19841]/30">
          
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#7dfabf]/15 filter blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdea2]/20 border border-[#edc065] text-[#ffdea2] text-xs font-bold w-fit">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
                <span>BorrowHub AI Assistant & Project Planner</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white tracking-tight leading-tight">
                Got a project in mind?<br />
                Let our AI configure the exact equipment rig.
              </h2>

              <p className="text-sm text-[#c0ecdd] max-w-xl leading-relaxed">
                Describe your project. Our AI scans real-time community inventory in MongoDB, checks compatibility, and builds a ready-to-borrow bundle saving you up to 98% vs buying.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <Link
                  to="/ai-planner"
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs text-[#7dfabf]">movie</span>
                  <span>Short film dusk scene</span>
                </Link>

                <Link
                  to="/ai-planner"
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs text-[#edc065]">yard</span>
                  <span>Raised garden bed timber</span>
                </Link>

                <Link
                  to="/ai-planner"
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs text-[#7dfabf]">camping</span>
                  <span>Alpine wilderness setup</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center lg:justify-end">
              <Link
                to="/ai-planner"
                className="px-8 py-4 rounded-full bg-[#ffdea2] hover:bg-[#fed689] text-[#2c1e00] font-extrabold text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                <span>Launch AI Planner</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 5. HOW BORROWHUB WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 w-full">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#006c48] uppercase tracking-wider">Effortless & Safe Sharing</span>
          <h2 className="text-3xl font-display font-bold text-[#00261d] mt-1">How BorrowHub Works</h2>
          <p className="text-xs text-[#717975] mt-1">Four simple steps to borrow or lend with smart locker access and underwriting protection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#dbe5dc] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6f1e7] text-[#006c48] flex items-center justify-center font-bold text-sm">1</div>
            <h3 className="font-bold text-sm text-[#00261d]">Discover & Plan</h3>
            <p className="text-xs text-[#414845]">Search local gear or let our AI Planner design the exact tool package for your weekend project.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#dbe5dc] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6f1e7] text-[#006c48] flex items-center justify-center font-bold text-sm">2</div>
            <h3 className="font-bold text-sm text-[#00261d]">Reserve & Lock In</h3>
            <p className="text-xs text-[#414845]">Request booking. Deposit is authorized in escrow and protected by BorrowGuard™ underwriting guarantee.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#dbe5dc] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6f1e7] text-[#006c48] flex items-center justify-center font-bold text-sm">3</div>
            <h3 className="font-bold text-sm text-[#00261d]">Pickup & Handover</h3>
            <p className="text-xs text-[#414845]">Retrieve gear with digital locker passcode or meet lender with verified checklist check-in.</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#dbe5dc] shadow-xs flex flex-col gap-3">
            <div className="w-10 h-10 rounded-full bg-[#e6f1e7] text-[#006c48] flex items-center justify-center font-bold text-sm">4</div>
            <h3 className="font-bold text-sm text-[#00261d]">Return & Release</h3>
            <p className="text-xs text-[#414845]">Drop gear back to the designated point. Photo condition check confirms return, releasing escrow deposit.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
