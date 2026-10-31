import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import EquipmentCard from '../components/EquipmentCard';
import { api } from '../services/api';
import { categoriesList } from '../data/equipmentData';

export default function ExplorePage({ onOpenListItemModal, refreshTrigger }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialLocation = searchParams.get('location') || '';

  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState(150);
  const [instantOnly, setInstantOnly] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [viewMode, setViewMode] = useState('grid');
  const [activePin, setActivePin] = useState(null);

  // Fetch real items from MongoDB
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const data = await api.getEquipment({
          search: searchQuery,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          maxPrice: maxPrice < 150 ? maxPrice : undefined,
          instantBook: instantOnly ? true : undefined,
          location: locationFilter.trim() || undefined
        });
        setEquipmentList(data);
      } catch (err) {
        console.error('Failed to fetch equipment listings:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [searchQuery, locationFilter, selectedCategory, maxPrice, instantOnly, refreshTrigger]);

  // Client-side sort and condition refinement
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      if (selectedCondition !== 'all' && item.condition && !item.condition.toLowerCase().includes(selectedCondition.toLowerCase())) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.pricePerDay - b.pricePerDay;
      if (sortBy === 'price-high') return b.pricePerDay - a.pricePerDay;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });
  }, [equipmentList, selectedCondition, sortBy]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setMaxPrice(150);
    setInstantOnly(false);
    setSelectedCondition('all');
    setSearchQuery('');
    setLocationFilter('');
    setSortBy('recommended');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e1ebe1]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#00261d]">
            Explore Equipment Marketplace
          </h1>
          <p className="text-xs text-[#717975] mt-1">
            Showing <strong className="text-[#00261d]">{filteredEquipment.length}</strong> {filteredEquipment.length === 1 ? 'item' : 'items'} from MongoDB
            {locationFilter ? <span> in <strong>{locationFilter}</strong></span> : ''}
          </p>
        </div>

        {/* View Switcher & Sort */}
        <div className="flex items-center gap-3">
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#414845]">
            <span className="font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-[#c0c8c4] rounded-full px-3 py-1.5 text-xs font-semibold text-[#00261d] focus:outline-none focus:border-[#006c48] cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Grid vs Map Toggle */}
          <div className="inline-flex p-1 rounded-full bg-[#e6f1e7] border border-[#c0c8c4]/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full flex items-center justify-center transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#00261d] shadow-2xs' : 'text-[#717975] hover:text-[#151e18]'
              }`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-full flex items-center justify-center transition-all ${
                viewMode === 'map' ? 'bg-white text-[#00261d] shadow-2xs' : 'text-[#717975] hover:text-[#151e18]'
              }`}
              title="Map View"
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Grid: Left Filter Sidebar + Right Results Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================= LEFT FILTER SIDEBAR (3 cols) ================= */}
        <aside className="lg:col-span-3 bg-white rounded-2xl border border-[#dbe5dc] p-5 shadow-xs space-y-6">
          
          <div className="flex items-center justify-between pb-3 border-b border-[#e1ebe1]">
            <span className="font-display font-bold text-sm text-[#00261d] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#006c48]">tune</span>
              <span>Filters</span>
            </span>
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-[#006c48] hover:underline"
            >
              Reset All
            </button>
          </div>

          {/* Search keyword inside filters */}
          <div>
            <label className="block text-xs font-bold text-[#151e18] mb-1.5">Keyword Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-xs text-[#717975]">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by name or tag..."
                className="w-full bg-[#FAFBF8] border border-[#c0c8c4] rounded-xl pl-9 pr-3 py-2 text-xs text-[#151e18] focus:outline-none focus:border-[#006c48]"
              />
            </div>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-xs font-bold text-[#151e18] mb-1.5">Filter by Location</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-xs text-[#717975]">location_on</span>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder="City, area, or neighborhood..."
                className="w-full bg-[#FAFBF8] border border-[#c0c8c4] rounded-xl pl-9 pr-3 py-2 text-xs text-[#151e18] focus:outline-none focus:border-[#006c48]"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-[#151e18] mb-2">Category</label>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                  selectedCategory === 'all' ? 'bg-[#e6f1e7] text-[#006c48]' : 'text-[#414845] hover:bg-[#ecf6ed]'
                }`}
              >
                <span>All Equipment</span>
              </button>
              {categoriesList.filter(c => c.id !== 'all').map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    selectedCategory === cat.name ? 'bg-[#e6f1e7] text-[#006c48]' : 'text-[#414845] hover:bg-[#ecf6ed]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#151e18] mb-2">
              <span>Max Daily Price</span>
              <span className="text-[#006c48] font-extrabold">${maxPrice}/day</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#006c48] cursor-pointer"
            />
          </div>

          {/* Instant Book Toggle */}
          <div className="pt-2 border-t border-[#e1ebe1]">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-[#151e18] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#006c48]">bolt</span>
                <span>Instant Book Only</span>
              </span>
              <input
                type="checkbox"
                checked={instantOnly}
                onChange={(e) => setInstantOnly(e.target.checked)}
                className="w-4 h-4 accent-[#006c48] rounded cursor-pointer"
              />
            </label>
          </div>

        </aside>

        {/* ================= RIGHT RESULTS CONTENT (9 cols) ================= */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-72 animate-pulse border border-[#e1ebe1]"></div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            filteredEquipment.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-[#c0c8c4] p-12 text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-5xl text-[#717975]">search_off</span>
                <h3 className="text-base font-bold text-[#00261d]">No listings match your criteria</h3>
                <p className="text-xs text-[#717975] max-w-sm">
                  {equipmentList.length === 0
                    ? 'No equipment has been listed in the database yet. Create the first listing!'
                    : 'Try clearing your filters or keyword search to see more equipment.'}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-full border border-[#c0c8c4] text-xs font-bold hover:bg-[#ecf6ed] transition-all"
                  >
                    Reset Filters
                  </button>
                  {onOpenListItemModal && (
                    <button
                      onClick={onOpenListItemModal}
                      className="px-5 py-2 rounded-full bg-[#123c32] text-white text-xs font-bold hover:bg-[#00261d] transition-all"
                    >
                      List Equipment
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEquipment.map((item) => (
                  <EquipmentCard key={item._id || item.id} item={item} />
                ))}
              </div>
            )
          ) : (
            /* Map View (Prototype Interactive Representation) */
            <div className="bg-white rounded-2xl border border-[#dbe5dc] overflow-hidden shadow-xs relative h-[600px] flex flex-col">
              <div className="p-3 bg-[#e6f1e7] border-b border-[#c0c8c4] flex items-center justify-between text-xs">
                <span className="font-bold text-[#006c48] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">hub</span>
                  <span>Community Map View (Prototype Representation)</span>
                </span>
                <span className="text-[#414845]">{filteredEquipment.length} equipment listings</span>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 bg-[#d8e6db] relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#006c48 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                
                {filteredEquipment.length === 0 ? (
                  <div className="text-center p-6 text-xs text-[#717975]">
                    <span className="material-symbols-outlined text-4xl mb-1 text-[#717975]">map</span>
                    <p className="font-bold text-[#151e18]">No equipment pins to display</p>
                    <p>Pins appear here as listings are added to the database.</p>
                  </div>
                ) : (
                  filteredEquipment.map((item, idx) => {
                    const itemId = item._id || item.id;
                    const leftPos = 20 + ((idx * 27) % 65);
                    const topPos = 25 + ((idx * 31) % 55);
                    return (
                      <button
                        key={itemId}
                        onClick={() => setActivePin(item)}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-full shadow-md font-bold text-xs flex items-center gap-1 transition-transform hover:scale-110 ${
                          activePin?._id === itemId || activePin?.id === itemId
                            ? 'bg-[#ba1a1a] text-white ring-2 ring-white z-20'
                            : 'bg-[#123c32] text-white z-10'
                        }`}
                        style={{
                          left: `${leftPos}%`,
                          top: `${topPos}%`
                        }}
                      >
                        <span className="material-symbols-outlined text-[14px]">sell</span>
                        <span>${item.pricePerDay}</span>
                      </button>
                    );
                  })
                )}

                {/* Selected Pin Details Callout */}
                {activePin && (
                  <div className="absolute bottom-6 left-6 right-6 max-w-sm bg-white rounded-2xl p-4 shadow-xl border border-[#006c48] z-30 animate-in fade-in">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#006c48] uppercase tracking-wider">{activePin.category}</span>
                        <h4 className="text-xs font-bold text-[#00261d] line-clamp-1">{activePin.title}</h4>
                        <p className="text-xs font-extrabold text-[#151e18] mt-1">${activePin.pricePerDay}/day • {activePin.location}</p>
                      </div>
                      <button onClick={() => setActivePin(null)} className="text-[#717975] hover:text-[#151e18]">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
