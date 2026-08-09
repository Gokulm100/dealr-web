import React from 'react';
import { MapPin, Eye } from 'lucide-react';

const FALLBACK = 'https://images.pexels.com/photos/10703759/pexels-photo-10703759.jpeg';

function formatPrice(price) {
  const n = Number(price);
  if (!n || Number.isNaN(n)) return 'Price on request';
  return `₹${n.toLocaleString('en-IN')}`;
}

function shortLocation(location) {
  if (!location) return 'Location not set';
  const parts = String(location).split(',');
  if (parts.length <= 2) return location;
  return `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`;
}

export default function AdCard({ listing, onClick }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(listing);
    }
  };

  return (
    <article
      className="ad-card"
      onClick={() => onClick(listing)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${listing.title}, ${formatPrice(listing.price)}`}
    >
      <div className="ad-card-media">
        <img
          className="ad-card-img"
          src={listing.images[0]}
          alt=""
          loading="lazy"
          onError={e => { e.target.src = FALLBACK; }}
        />
        {listing.category && (
          <span className="ad-card-category">{listing.category}</span>
        )}
      </div>

      <div className="ad-card-body">
        <h3 className="ad-card-title">{listing.title}</h3>
        <p className="ad-card-price">{formatPrice(listing.price)}</p>

        <div className="ad-card-meta">
          <span className="ad-card-location" title={listing.location}>
            <MapPin size={13} strokeWidth={2.25} aria-hidden />
            <span className="ad-card-location-text">{shortLocation(listing.location)}</span>
          </span>
          {listing.views > 0 && (
            <span className="ad-card-views">
              <Eye size={13} strokeWidth={2.25} aria-hidden />
              {listing.views}
            </span>
          )}
        </div>

        {listing.posted && (
          <span className="ad-card-date">{listing.posted}</span>
        )}
      </div>
    </article>
  );
}
