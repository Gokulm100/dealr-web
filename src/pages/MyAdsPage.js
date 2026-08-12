import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MarkSoldModal from '../components/MarkSoldModal';
import PostSaleReminderModal from '../components/PostSaleReminderModal';
import ReviewModal from '../components/ReviewModal';
import { SkeletonMyAdRow } from '../components/Skeleton';
import SeededBadge from '../components/SeededBadge';
import FacebookMark from '../components/FacebookMark';
import { getFacebookShareStatus, shareAdToFacebook } from '../utils/facebookShare';

const FALLBACK = 'https://images.pexels.com/photos/10703759/pexels-photo-10703759.jpeg';
const PAGE_SIZE = 10;

export default function MyAdsPage() {
  const { user, apiFetch, navigate, showToast, showModal, mapListing, hasConsented } = useApp();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAds, setTotalAds] = useState(0);
  const [soldModalAd, setSoldModalAd] = useState(null);
  const [postSaleReminder, setPostSaleReminder] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [facebookConfigured, setFacebookConfigured] = useState(false);
  const [sharingAdId, setSharingAdId] = useState(null);

  const load = async (pageNum = 1) => {
    if (!user) {
      setAds([]);
      setPage(1);
      setTotalPages(1);
      setTotalAds(0);
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
        body: JSON.stringify({ id: user._id, page: pageNum, limit: PAGE_SIZE })
      });
      const data = Array.isArray(result) ? result : (result.ads || result.data || []);
      setAds(data.map(mapListing));
      setPage(Number(result?.page) || pageNum);
      setTotalPages(Math.max(1, Number(result?.totalPages) || 1));
      setTotalAds(Number(result?.total) || data.length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]); // eslint-disable-line

  useEffect(() => {
    let cancelled = false;
    getFacebookShareStatus().then((status) => {
      if (!cancelled) setFacebookConfigured(!!status.configured);
    });
    return () => { cancelled = true; };
  }, []);

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
        load(page);
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
        load(page);
      } catch { showToast('Failed to enable ad.', 'error'); }
    });
  };

  const handleShareToFacebook = async (ad) => {
    setSharingAdId(ad.id);
    try {
      await shareAdToFacebook(ad.id, localStorage.getItem('authToken'));
      showToast('Shared on the Dealr Facebook page.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not share to Facebook.', 'error');
    } finally {
      setSharingAdId(null);
    }
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

  const changePage = (nextPage) => {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    load(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div>
          <div className="page-title" style={{ marginBottom: 0 }}>My Ads</div>
          {!loading && totalAds > 0 && (
            <div className="my-ads-total">
              {totalAds} {totalAds === 1 ? 'listing' : 'listings'}
            </div>
          )}
        </div>
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
                {facebookConfigured && ad.isActive !== false && !ad.isSeeded && (
                  <button
                    className="edit-btn facebook-share-btn"
                    onClick={(e) => { e.stopPropagation(); handleShareToFacebook(ad); }}
                    disabled={sharingAdId === ad.id}
                  >
                    <FacebookMark size={13} />
                    {sharingAdId === ad.id ? 'Sharing…' : 'Facebook'}
                  </button>
                )}
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

      {!loading && totalPages > 1 && (
        <nav className="my-ads-pagination" aria-label="My Ads pages">
          <button
            type="button"
            className="my-ads-pagination-btn"
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="my-ads-pagination-status" aria-live="polite">
            Page <strong>{page}</strong> of {totalPages}
          </span>
          <button
            type="button"
            className="my-ads-pagination-btn"
            onClick={() => changePage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </nav>
      )}

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
