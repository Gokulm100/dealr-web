import React, { useState, useEffect } from 'react';
import { Edit, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import MarkSoldModal from './MarkSoldModal';
import PostSaleReminderModal from './PostSaleReminderModal';
import ReviewModal from './ReviewModal';
import FacebookMark from './FacebookMark';
import { getFacebookShareStatus, shareAdToFacebook } from '../utils/facebookShare';

export default function OwnerAdActions({ ad, onAdUpdated }) {
  const { navigate, apiFetch, showToast, showModal } = useApp();
  const [soldOpen, setSoldOpen] = useState(false);
  const [postSaleReminder, setPostSaleReminder] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [facebookConfigured, setFacebookConfigured] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getFacebookShareStatus().then((status) => {
      if (!cancelled) setFacebookConfigured(!!status.configured);
    });
    return () => { cancelled = true; };
  }, []);

  if (!ad) return null;

  const canShareToFacebook = facebookConfigured && !ad.isSold && ad.isActive !== false && !ad.isSeeded;

  const shareToFacebook = async () => {
    setSharing(true);
    try {
      await shareAdToFacebook(ad.id, localStorage.getItem('authToken'));
      showToast('Facebook draft with photos is ready to publish.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not share to Facebook.', 'error');
    } finally {
      setSharing(false);
    }
  };

  if (ad.isSold) {
    return (
      <div className="owner-ad-sold-banner">
        <CheckCircle size={18} />
        <span>This ad is marked as sold</span>
      </div>
    );
  }

  const toggleActive = () => {
    const disabling = ad.isActive !== false;
    showModal(
      disabling ? 'Disable Ad' : 'Enable Ad',
      disabling
        ? `"${ad.title}" will no longer be visible to others.`
        : `"${ad.title}" will be visible to everyone again.`,
      disabling ? '🚫' : '✅',
      async () => {
        setBusy(true);
        try {
          await apiFetch(disabling ? '/api/ads/disableAd' : '/api/ads/enableAd', {
            method: 'POST',
            body: JSON.stringify({ adId: ad.id }),
          });
          showToast(disabling ? 'Ad disabled.' : 'Ad enabled.', 'success');
          onAdUpdated?.({ ...ad, isActive: !disabling });
        } catch {
          showToast(`Failed to ${disabling ? 'disable' : 'enable'} ad.`, 'error');
        } finally {
          setBusy(false);
        }
      }
    );
  };

  const handleSold = (target) => {
    onAdUpdated?.({ ...ad, isSold: true, status: 'sold' });
    setPostSaleReminder(target);
  };

  const dismissPostSaleReminder = () => {
    setPostSaleReminder(null);
    showToast('You can leave a review anytime from Profile.', 'success');
  };

  const isDisabled = ad.isActive === false;

  return (
    <>
      <div className="owner-ad-actions">
        <div className="owner-ad-actions-title">Manage your ad</div>
        <div className="owner-ad-actions-row">
          <button
            type="button"
            className="owner-ad-btn owner-ad-btn-edit"
            onClick={() => navigate('post', { ad })}
            disabled={busy}
          >
            <Edit size={15} /> Edit
          </button>
          <button
            type="button"
            className={`owner-ad-btn ${isDisabled ? 'owner-ad-btn-enable' : 'owner-ad-btn-disable'}`}
            onClick={toggleActive}
            disabled={busy}
          >
            {isDisabled ? <Eye size={15} /> : <EyeOff size={15} />}
            {isDisabled ? 'Enable' : 'Disable'}
          </button>
          <button
            type="button"
            className="owner-ad-btn owner-ad-btn-sold"
            onClick={() => setSoldOpen(true)}
            disabled={busy}
          >
            <CheckCircle size={15} /> Mark Sold
          </button>
          {canShareToFacebook && (
            <button
              type="button"
              className="owner-ad-btn owner-ad-btn-facebook"
              onClick={shareToFacebook}
              disabled={busy || sharing}
            >
              <FacebookMark />
              {sharing ? 'Saving draft…' : 'Facebook draft'}
            </button>
          )}
        </div>
      </div>

      <MarkSoldModal
        ad={ad}
        open={soldOpen}
        onClose={() => setSoldOpen(false)}
        onSold={handleSold}
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
          onSubmitted={() => showToast('Thank you! Your review helps keep Dealr safe.', 'success')}
        />
      )}
    </>
  );
}
