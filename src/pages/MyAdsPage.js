import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MarkSoldModal from '../components/MarkSoldModal';
import PostSaleReminderModal from '../components/PostSaleReminderModal';
import ReviewModal from '../components/ReviewModal';
import { SkeletonMyAdRow } from '../components/Skeleton';
import SeededBadge from '../components/SeededBadge';

const FALLBACK = 'https://images.pexels.com/photos/10703759/pexels-photo-10703759.jpeg';

export default function MyAdsPage() {
  const { user, apiFetch, navigate, showToast, showModal, mapListing, hasConsented } = useApp();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soldModalAd, setSoldModalAd] = useState(null);
  const [postSaleReminder, setPostSaleReminder] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);

  const load = async () => {
    if (!user) {
      setAds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch(`/api/ads/listUserAds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: user._id })
      });
      const data = Array.isArray(result) ? result : (result.ads || result.data || []);
      setAds(data.map(mapListing));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line

  useEffect(() => {
    if (!user) {
      setPendingReviews([]);
      return;
    }
    let cancelled = false;
    apiFetch('/api/reviews/pending')
      .then((data) => {
        if (!cancelled) setPendingReviews(data.pending || []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, apiFetch, postSaleReminder, reviewTarget]);

  const handleDelete = (ad) => {
    showModal('Disable Ad', `Disable "${ad.title}"? This cannot be undone.`, '🗑️', async () => {
      try {
        const token = localStorage.getItem('authToken');
        await apiFetch(`/api/ads/disableAd`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ adId: ad.id })
        });
        showToast('Ad disabled.', 'success');
        load();
      } catch { showToast('Failed to disable ad.', 'error'); }
    });
  };
  const handleEnable = (ad) => {
    showModal('Enable Ad', `Enable "${ad.title}"?`, '✅', async () => {
      try {
        const token = localStorage.getItem('authToken');
        await apiFetch(`/api/ads/enableAd`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ adId: ad.id })
        });
        showToast('Ad enabled.', 'success');
        load();
      } catch { showToast('Failed to enable ad.', 'error'); }
    });
  };

  const handleSoldComplete = (target) => {
    setAds((prev) => prev.map((a) =>
      a.id === target.adId ? { ...a, isSold: true, status: 'sold' } : a
    ));
    setPostSaleReminder(target);
  };

  const dismissPostSaleReminder = () => {
    setPostSaleReminder(null);
    showToast('You can leave a review anytime from Profile.', 'success');
  };

  if (!user) {
    return (
      <div className="login-wall">
        <div className="login-icon-circle">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </div>
        <div className="login-title">My Ads</div>
        <div className="login-sub">Sign in to manage your posted ads.</div>
        <button className="google-btn" onClick={() => navigate('profile')}>Sign In</button>
      </div>
    );
  }

  if (user && hasConsented === false) {
    return (
      <div className="messages-page-overlay-wrap">
        <div className="messages-page-overlay-blur" />
        <div className="messages-page-overlay-content">
          <h2>Please Accept Privacy & Terms</h2>
          <p style={{margin: '16px 0 24px 0'}}>To manage your ads and other features, please accept our Privacy Policy and Terms of Service.</p>
          <button className="accept-btn" style={{minWidth: 180}} onClick={() => navigate('consent')}>Review & Accept</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="page-title" style={{ marginBottom: 0 }}>My Ads</div>
        <button
          className="topbar-btn primary"
          style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={() => navigate('post')}
        >
          <PlusCircle size={16} /> Post Ad
        </button>
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonMyAdRow key={`skel-${i}`} />)}

      {!loading && ads.length === 0 && (
        <div className="empty-state">
          <span className="empty-title">No ads yet</span>
          <span className="empty-sub">Post your first ad to start selling!</span>
          <button className="submit-btn" style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }} onClick={() => navigate('post')}>
            Post an Ad
          </button>
        </div>
      )}

      {!loading && ads.map(ad => (
        <div
          key={ad.id}
          className="my-ad-row"
          style={{ cursor: 'pointer' }}
          onClick={e => {
            if (
              e.target.closest('.my-ad-actions') ||
              e.target.classList.contains('edit-btn') ||
              e.target.classList.contains('delete-btn')
            ) return;
            navigate('ad-detail', { listing: ad });
          }}
        >
          <img
            className="my-ad-img"
            src={ad.images[0]}
            alt={ad.title}
            onError={e => { e.target.src = FALLBACK; }}
          />
          <div className="my-ad-info">
            <div className="my-ad-title">{ad.title}</div>
            <div className="my-ad-price">₹{Number(ad.price).toLocaleString('en-IN')}</div>
            <div className="my-ad-meta">{ad.location} · {ad.posted}</div>
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {ad.isSold ? (
                <span className="ad-status-badge inactive">Sold</span>
              ) : (
                <span className={`ad-status-badge ${ad.isActive === false ? 'inactive' : 'active'}`}>
                  {ad.isActive === false ? 'inactive' : 'Active'}
                </span>
              )}
              {ad.isSeeded && <SeededBadge size="sm" />}
            </div>
          </div>
          <div className="my-ad-actions">
            {!ad.isSold && (
              <>
                <button className="edit-btn" onClick={e => { e.stopPropagation(); navigate('post', { ad }); }}>Edit</button>
                {ad.isActive === true ? (
                  <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(ad); }}>Disable</button>
                ) : (
                  <button className="edit-btn" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: 'var(--success)' }} onClick={e => { e.stopPropagation(); handleEnable(ad); }}>Enable</button>
                )}
                <button
                  className="edit-btn"
                  style={{ background: '#e6ecf4', borderColor: '#90bcee', color: 'var(--primary)' }}
                  onClick={e => { e.stopPropagation(); setSoldModalAd(ad); }}
                >
                  Mark Sold
                </button>
              </>
            )}
            {ad.isSold && (() => {
              const pending = pendingReviews.find((item) => String(item.adId) === String(ad.id));
              if (!pending) return null;
              return (
                <button
                  type="button"
                  className="my-ad-review-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReviewTarget({
                      adId: pending.adId,
                      adTitle: pending.adTitle,
                      revieweeName: pending.revieweeName,
                      revieweePic: pending.revieweePic,
                    });
                  }}
                >
                  ★ Rate {pending.revieweeName}
                </button>
              );
            })()}
          </div>
        </div>
      ))}

      <MarkSoldModal
        ad={soldModalAd}
        open={!!soldModalAd}
        onClose={() => setSoldModalAd(null)}
        onSold={handleSoldComplete}
      />

      <PostSaleReminderModal
        open={!!postSaleReminder}
        onClose={dismissPostSaleReminder}
        onRateNow={() => {
          setReviewTarget(postSaleReminder);
          setPostSaleReminder(null);
        }}
        adTitle={postSaleReminder?.adTitle}
        revieweeName={postSaleReminder?.revieweeName}
        counterpartyName={postSaleReminder?.counterpartyName}
        saleAmount={postSaleReminder?.saleAmount}
      />

      {reviewTarget && (
        <ReviewModal
          adId={reviewTarget.adId}
          adTitle={reviewTarget.adTitle}
          revieweeName={reviewTarget.revieweeName}
          revieweePic={reviewTarget.revieweePic}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            showToast('Thank you! Your review helps keep Dealr safe.', 'success');
            setPendingReviews((prev) => prev.filter((item) => String(item.adId) !== String(reviewTarget.adId)));
          }}
        />
      )}
    </div>
  );
}
