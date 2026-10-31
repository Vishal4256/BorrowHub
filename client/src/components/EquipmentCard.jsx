import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageUrl } from '../services/api';

export default function EquipmentCard({ item }) {
  const [liked, setLiked] = useState(false);

  const itemId = item._id || item.id;
  const rawImage = item.images && item.images.length > 0 && item.images[0] ? item.images[0] : '';
  const imageSrc = rawImage
    ? resolveImageUrl(rawImage)
    : 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80';

  const lenderName =
    item.lender?.name ||
    item.lenderSnapshot?.name ||
    'Community Member';

  const lenderAvatar = resolveImageUrl(
    item.lender?.avatar ||
    item.lenderSnapshot?.avatar ||
    ''
  );

  const lenderInitial = lenderName.charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-2xl border border-[#dbe5dc] hover:border-[#006c48]/50 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group">
      
      {/* Top Media Showcase */}
      <div className="relative aspect-[4/3] bg-[#ecf6ed] overflow-hidden">
        <Link to={`/equipment/${itemId}`}>
          <img
            src={imageSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Location or Distance Badge */}
        {(item.distance || item.location) && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-[#006c48] flex items-center gap-1 shadow-xs max-w-[70%] truncate">
            <span className="material-symbols-outlined text-xs flex-shrink-0">
              {item.distance ? 'near_me' : 'location_on'}
            </span>
            <span className="truncate">{item.distance || item.location}</span>
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setLiked(!liked);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-[#ba1a1a] hover:scale-110 transition-transform shadow-xs"
          title="Save to Wishlist"
        >
          <span 
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
          >
            favorite
          </span>
        </button>

        {/* Instant Book Tag */}
        {item.instantBook && (
          <span className="absolute bottom-3 left-3 bg-[#123c32]/90 backdrop-blur-md text-[#7dfabf] px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            Instant Book
          </span>
        )}
      </div>

      {/* Body Content */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Category & Rating Bar */}
          <div className="flex items-center justify-between text-xs text-[#414845] mb-1.5">
            <span className="uppercase tracking-wider font-semibold text-[#006c48] text-[10px]">{item.category}</span>
            <div className="flex items-center gap-1 text-[#151e18] font-bold">
              <span className="material-symbols-outlined text-[#edc065] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              {item.reviewsCount > 0 ? (
                <>
                  <span>{item.rating}</span>
                  <span className="text-[#717975] font-normal">({item.reviewsCount})</span>
                </>
              ) : (
                <span className="text-[11px] text-[#717975] font-normal">New</span>
              )}
            </div>
          </div>

          {/* Title */}
          <Link to={`/equipment/${itemId}`} className="block">
            <h3 className="font-display font-bold text-sm text-[#00261d] line-clamp-2 hover:text-[#006c48] transition-colors leading-snug">
              {item.title}
            </h3>
          </Link>

          {/* Lender Info */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#f2fcf2]">
            <div className="w-5 h-5 rounded-full bg-[#123c32] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden border border-[#c0c8c4] flex-shrink-0">
              {lenderAvatar ? (
                <img src={lenderAvatar} alt={lenderName} className="w-full h-full object-cover" />
              ) : (
                <span>{lenderInitial}</span>
              )}
            </div>
            <span className="text-xs text-[#414845] truncate">
              Lender: <strong className="text-[#151e18] font-semibold">{lenderName}</strong>
            </span>
          </div>
        </div>

        {/* Pricing & CTA footer */}
        <div className="pt-2 border-t border-[#e6f1e7] flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold font-display text-[#00261d]">${item.pricePerDay}</span>
              <span className="text-xs text-[#717975]">/ day</span>
            </div>
            {item.retailValue > item.pricePerDay && (
              <span className="text-[10px] text-[#006c48] font-medium block">
                Save ${(item.retailValue - item.pricePerDay * 3).toLocaleString()} vs buying
              </span>
            )}
          </div>

          <Link
            to={`/equipment/${itemId}`}
            className="px-3.5 py-1.5 rounded-full bg-[#ecf6ed] hover:bg-[#123c32] text-[#006c48] hover:text-white text-xs font-semibold transition-all active:scale-95 shadow-2xs"
          >
            Borrow
          </Link>
        </div>

      </div>
    </div>
  );
}
