import React, { useRef, useEffect, useCallback } from 'react';
import { Activity } from 'lucide-react';
import AdCard from '../components/AdCard';
import FeatureBannerCarousel from '../components/FeatureBannerCarousel';
import FilterBar from '../components/FilterBar';
import { SkeletonAdCard } from '../components/Skeleton';
import { useApp } from '../context/AppContext';

export default function HomePage() {
  const {
    listings, loading, hasMore, page, setPage,
    fetchListings, navigate,
    activeFilterCount,
  } = useApp();

  const sentinelRef = useRef(null);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchListings(next, false);
  }, [loading, hasMore, page, setPage, fetchListings]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '280px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, listings.length]);

  return (
    <div>
      <FeatureBannerCarousel />
      <FilterBar />

      <div className="ads-grid">
        {loading && listings.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonAdCard key={`skel-${i}`} />)
        ) : listings.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <Activity size={48} style={{ color: 'var(--border)' }} />
            <span className="empty-title">No ads found</span>
            <span className="empty-sub">
              {activeFilterCount > 0
                ? 'Try adjusting your filters'
                : 'Try a different search or category'}
            </span>
          </div>
        ) : (
          listings.map(listing => (
            <AdCard
              key={listing.id}
              listing={listing}
              onClick={(l) => navigate('detail', { listing: l })}
            />
          ))
        )}
      </div>

      {listings.length > 0 && (
        <div ref={sentinelRef} className="ads-scroll-sentinel">
          {loading && hasMore && (
            <div className="ads-loading-more">
              <div className="spinner" />
              <span>Loading more listings…</span>
            </div>
          )}
          {!loading && !hasMore && (
            <p className="ads-end-message">You&apos;ve reached the end</p>
          )}
        </div>
      )}
    </div>
  );
}
