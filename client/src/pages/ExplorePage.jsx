import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import EquipmentCard from '../components/EquipmentCard';
import LocationSelector from '../components/LocationSelector';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { categoriesList } from '../data/equipmentData';

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

function getPlaceName(loc) {
  if (!loc) return '';
  const parts = [loc.city, loc.state].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return loc.label || loc.address || '';
}

export default function ExplorePage({ onOpenListItemModal, refreshTrigger }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, updateUserLocation } = useAuth();

  const initialSearch = searchParams.get('search') || '';
  const initialLocation = searchParams.get('location') || '';

  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [selectedGeoLocation, setSelectedGeoLocation] = useState(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [maxPrice, setMaxPrice] = useState(150);
  const [instantOnly, setInstantOnly] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [viewMode, setViewMode] = useState('grid');
  const [activePin, setActivePin] = useState(null);

  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [savingPreferred, setSavingPreferred] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const hasGeoActive = Boolean(
    selectedGeoLocation?.coordinates?.coordinates &&
    selectedGeoLocation.coordinates.coordinates.length === 2
  );

  // Fetch equipment from MongoDB (nearby geospatial query when location selected, else standard explore)
  useEffect(() => {
    let cancelled = false;

    const fetchEquipment = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        if (hasGeoActive) {
          const [lng, lat] = selectedGeoLocation.coordinates.coordinates;
          const nearbySort = sortBy === 'recommended' ? 'distance' : sortBy;
          const data = await api.getNearbyEquipment({
            lat,
            lng,
            radius: radiusKm,
            search: searchQuery.trim() || undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            maxPrice: maxPrice < 150 ? maxPrice : undefined,
            instantBook: instantOnly ? true : undefined,
            condition: selectedCondition !== 'all' ? selectedCondition : undefined,
            sortBy: nearbySort,
            page,
            limit: 12
          });
          if (cancelled) return;
          setEquipmentList(Array.isArray(data?.items) ? data.items : []);
          setPagination(data?.pagination || null);
        } else {
          const data = await api.getEquipment({
            search: searchQuery,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            maxPrice: maxPrice < 150 ? maxPrice : undefined,
            instantBook: instantOnly ? true : undefined,
            location: locationFilter.trim() || undefined
          });
          if (cancelled) return;
          setEquipmentList(Array.isArray(data) ? data : []);
          setPagination(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch equipment listings:', err.message);
        setFetchError(err.message || 'Failed to fetch equipment listings.');
        setEquipmentList([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchEquipment();
    return () => {
      cancelled = true;
    };
  }, [
    hasGeoActive,
    selectedGeoLocation,
    radiusKm,
    page,
    searchQuery,
    locationFilter,
    selectedCategory,
    maxPrice,
    instantOnly,
    selectedCondition,
    sortBy,
    refreshTrigger
  ]);

  // Client-side sort and condition refinement (for standard non-geo mode; geo mode sorts on backend)
  const filteredEquipment = useMemo(() => {
    if (hasGeoActive) return equipmentList;

    return equipmentList
      .filter((item) => {
        if (
          selectedCondition !== 'all' &&
          item.condition &&
          !item.condition.toLowerCase().includes(selectedCondition.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.pricePerDay - b.pricePerDay;
        if (sortBy === 'price-high') return b.pricePerDay - a.pricePerDay;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return 0;
      });
  }, [equipmentList, hasGeoActive, selectedCondition, sortBy]);

  const handleSelectGeoLocation = (loc) => {
    setSelectedGeoLocation(loc);
    setLocationFilter('');
    setPage(1);
    setSortBy('recommended');
    setSaveMessage(null);

    if (user) {
      const existingCoords = user.preferredLocation?.coordinates?.coordinates;
      const newCoords = loc?.coordinates?.coordinates;
      const isDifferent =
        !existingCoords ||
        !newCoords ||
        existingCoords[0] !== newCoords[0] ||
        existingCoords[1] !== newCoords[1];
      setShowSavePrompt(isDifferent);
    } else {
      setShowSavePrompt(false);
    }
  };

  const handleClearGeoLocation = () => {
    setSelectedGeoLocation(null);
    setShowSavePrompt(false);
    setSaveMessage(null);
    setPage(1);
    setPagination(null);
  };

  const handleSavePreferredLocation = async () => {
    if (!selectedGeoLocation || !user) return;
    try {
      setSavingPreferred(true);
      await updateUserLocation({
        address: selectedGeoLocation.address || getPlaceName(selectedGeoLocation),
        city: selectedGeoLocation.city || '',
        state: selectedGeoLocation.state || '',
        country: selectedGeoLocation.country || '',
        postalCode: selectedGeoLocation.postalCode || '',
        coordinates: selectedGeoLocation.coordinates
      });
      setShowSavePrompt(false);
      setSaveMessage('Preferred location saved to your profile.');
    } catch (err) {
      setSaveMessage(err.message || 'Could not save preferred location.');
    } finally {
      setSavingPreferred(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setMaxPrice(150);
    setInstantOnly(false);
    setSelectedCondition('all');
    setSearchQuery('');
    setLocationFilter('');
    setSelectedGeoLocation(null);
    setRadiusKm(25);
    setPage(1);
    setPagination(null);
    setSortBy('recommended');
    setShowSavePrompt(false);
    setSaveMessage(null);
    setSearchParams({});
  };

  const activePlaceName = getPlaceName(selectedGeoLocation);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 w-full flex flex-col gap-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e1ebe1]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#00261d]">
            Explore Equipment Marketplace
          </h1>
          <p className="text-xs text-[#717975] mt-1">
            {hasGeoActive ? (
              <span>
                Showing equipment near <strong className="text-[#00261d]">{activePlaceName}</strong> within{' '}
                <strong className="text-[#006c48]">{radiusKm} km</strong> ({pagination?.total ?? filteredEquipment.length}{' '}
                {(pagination?.total ?? filteredEquipment.length) === 1 ? 'item' : 'items'})
              </span>
            ) : (
              <span>
                Showing <strong className="text-[#00261d]">{filteredEquipment.length}</strong>{' '}
                {filteredEquipment.length === 1 ? 'item' : 'items'} from MongoDB
                {locationFilter ? <span> matching <strong>{locationFilter}</strong></span> : ''}
              </span>
            )}
          </p>
        </div>

        {/* View Switcher & Sort */}
        <div className="flex items-center gap-3">
          
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#414845]">
            <span className="font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-[#c0c8c4] rounded-full px-3 py-1.5 text-xs font-semibold text-[#00261d] focus:outline-none focus:border-[#006c48] cursor-pointer"
            >
              <option value="recommended">{hasGeoActive ? 'Nearest First' : 'Recommended'}</option>
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

      {/* Smart Location & Distance Bar */}
      <section className="bg-white rounded-2xl border border-[#dbe5dc] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7">
            <LocationSelector
              value={selectedGeoLocation}
              savedLocation={user?.preferredLocation}
              label="Search Near a Location"
              placeholder="Enter city, area, locality, or postal code (e.g. Phagwara, Punjab)..."
              onSelect={handleSelectGeoLocation}
              onClear={handleClearGeoLocation}
              compact
            />
          </div>

          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#151e18]">Distance Radius</span>
              {!hasGeoActive && (
                <span className="text-[11px] text-[#717975]">Select a location to filter by km</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Distance filter">
              {RADIUS_OPTIONS.map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => {
                    setRadiusKm(km);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    radiusKm === km
                      ? 'bg-[#006c48] text-white border-[#006c48] shadow-2xs'
                      : 'bg-[#FAFBF8] text-[#414845] border-[#c0c8c4] hover:bg-[#ecf6ed]'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permission Prompt to Save Preferred Location */}
        {showSavePrompt && selectedGeoLocation && user && (
          <div className="p-3 rounded-xl bg-[#f2fcf2] border border-[#006c48]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs text-[#151e18]">
              Save <strong>{activePlaceName}</strong> as your preferred BorrowHub location?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSavePreferredLocation}
                disabled={savingPreferred}
                className="px-3.5 py-1.5 rounded-full bg-[#006c48] hover:bg-[#123c32] text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {savingPreferred ? 'Saving...' : 'Save Location'}
              </button>
              <button
                type="button"
                onClick={() => setShowSavePrompt(false)}
                className="px-3 py-1.5 rounded-full border border-[#c0c8c4] bg-white text-xs font-semibold text-[#414845] hover:bg-[#FAFBF8]"
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {saveMessage && (
          <p className="text-xs font-semibold text-[#006c48] flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>{saveMessage}</span>
          </p>
        )}
      </section>

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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by name or tag..."
                className="w-full bg-[#FAFBF8] border border-[#c0c8c4] rounded-xl pl-9 pr-3 py-2 text-xs text-[#151e18] focus:outline-none focus:border-[#006c48]"
              />
            </div>
          </div>

          {/* Text Area Filter (active when not using verified geo radius search) */}
          {!hasGeoActive && (
            <div>
              <label className="block text-xs font-bold text-[#151e18] mb-1.5">Filter by Area Text</label>
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
          )}

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-[#151e18] mb-2">Category</label>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setPage(1);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                  selectedCategory === 'all' ? 'bg-[#e6f1e7] text-[#006c48]' : 'text-[#414845] hover:bg-[#ecf6ed]'
                }`}
              >
                <span>All Equipment</span>
              </button>
              {categoriesList.filter(c => c.id !== 'all').map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setPage(1);
                  }}
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
              onChange={(e) => {
                setMaxPrice(Number(e.target.value));
                setPage(1);
              }}
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
                onChange={(e) => {
                  setInstantOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-4 h-4 accent-[#006c48] rounded cursor-pointer"
              />
            </label>
          </div>

        </aside>

        {/* ================= RIGHT RESULTS CONTENT (9 cols) ================= */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          
          {fetchError && (
            <div className="p-4 rounded-2xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-xs text-[#93000a] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{fetchError}</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1 rounded-full bg-white text-[#93000a] font-bold"
              >
                Reset
              </button>
            </div>
          )}

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
                <h3 className="text-base font-bold text-[#00261d]">
                  {hasGeoActive
                    ? `No equipment found within ${radiusKm} km of ${activePlaceName}`
                    : 'No listings match your criteria'}
                </h3>
                <p className="text-xs text-[#717975] max-w-sm">
                  {hasGeoActive
                    ? 'Try expanding your search radius or clearing filters to discover gear nearby.'
                    : equipmentList.length === 0
                    ? 'No equipment has been listed in the database yet. Create the first listing!'
                    : 'Try clearing your filters or keyword search to see more equipment.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {hasGeoActive && radiusKm < 100 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRadiusKm(100);
                        setPage(1);
                      }}
                      className="px-4 py-2 rounded-full bg-[#006c48] text-white text-xs font-bold hover:bg-[#123c32] transition-all"
                    >
                      Expand to 100 km
                    </button>
                  )}
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEquipment.map((item) => (
                    <EquipmentCard key={item._id || item.id} item={item} />
                  ))}
                </div>

                {/* Pagination Controls for Geospatial Search */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-[#e1ebe1] text-xs">
                    <span className="text-[#717975]">
                      Page <strong className="text-[#00261d]">{pagination.page}</strong> of{' '}
                      <strong className="text-[#00261d]">{pagination.totalPages}</strong> ({pagination.total} results)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="px-3.5 py-1.5 rounded-full border border-[#c0c8c4] font-semibold text-[#151e18] hover:bg-[#ecf6ed] disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3.5 py-1.5 rounded-full bg-[#123c32] text-white font-semibold hover:bg-[#006c48] disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            /* Map View (Prototype Interactive Representation) */
            <div className="bg-white rounded-2xl border border-[#dbe5dc] overflow-hidden shadow-xs relative h-[600px] flex flex-col">
              <div className="p-3 bg-[#e6f1e7] border-b border-[#c0c8c4] flex items-center justify-between text-xs">
                <span className="font-bold text-[#006c48] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">hub</span>
                  <span>
                    {hasGeoActive ? `Nearby Map (${activePlaceName} • ${radiusKm} km)` : 'Community Map View'}
                  </span>
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
                    <p>Pins appear here as listings match your filters.</p>
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
                        <p className="text-xs font-extrabold text-[#151e18] mt-1">
                          ${activePin.pricePerDay}/day •{' '}
                          {typeof activePin.distanceKm === 'number'
                            ? `${activePin.distanceKm.toFixed(1)} km away (${activePin.location})`
                            : activePin.location}
                        </p>
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
