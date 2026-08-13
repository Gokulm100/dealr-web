import React, { useState, useEffect, useRef } from 'react';
import { createOptimisticMessage, mergeWithPending, removeOptimistic } from '../utils/chatMessages';
import {
  parseChatPayload,
  payloadToMessage,
  payloadMatchesChat,
  payloadMatchesAd,
  appendIncomingMessage,
  normalizeId,
} from '../utils/chatSocket';
import { emitJoin } from '../utils/socket';
import { confirmAndReportUser } from '../utils/reportUser';
import { ArrowLeft, MapPin, Eye, Clock, Tag, User, Send, Shield, Flag, MessageCircle, ChevronRight, Sparkles, ArrowUp, Share2 } from 'lucide-react';
import { useApp, mapListing } from '../context/AppContext';
import AiAnalytics from '../components/AiAnalytics';
import SimilarAds from '../components/SimilarAds';
import ReportAdModal from '../components/ReportAdModal';
import GenuinityMeter from '../components/GenuinityMeter';
import SellerTrustLine from '../components/SellerTrustLine';
import ReviewModal from '../components/ReviewModal';
import OwnerAdActions from '../components/OwnerAdActions';
import SeededBadge, { SeededNotice } from '../components/SeededBadge';
import { getAdIdFromLocation } from '../utils/facebookShare';
import { shareListing } from '../utils/shareListing';

const FALLBACK = 'https://images.pexels.com/photos/10703759/pexels-photo-10703759.jpeg';

const SAFETY_TIPS = [
  'Meet the seller in a public place',
  'Check the item before you buy',
  'Pay only after collecting the item',
];

function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) return null;
  const go = (dir) => setIdx(i => (i + dir + images.length) % images.length);
  return (
    <div className="img-carousel-wrap">
      <div className="img-carousel" style={{ transform: `translateX(-${idx * 100}%)`, transition: 'transform 0.3s', display: 'flex' }}>
        {images.map((src, i) => (
          <img key={i} className="carousel-img" src={src} alt={`img ${i + 1}`} onError={e => { e.target.src = FALLBACK; }} style={{ minWidth: '100%' }} />
        ))}
      </div>
      {images.length > 1 && <>
        <button className="carousel-nav prev" onClick={() => go(-1)}>‹</button>
        <button className="carousel-nav next" onClick={() => go(1)}>›</button>
        <div className="carousel-dots">
          {images.map((_, i) => (
            <button key={i} className={`carousel-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)} />
          ))}
        </div>
      </>}
    </div>
  );
}

function AiSummary({ listing, apiFetch }) {
  const [state, setState] = useState('loading'); // loading | done | error
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // If the ad already carries a stored summary, use it directly — no API call.
    if (listing.aiSummary && Object.keys(listing.aiSummary).length > 0) {
      setSummary(listing.aiSummary);
      setState('done');
      return () => { cancelled = true; };
    }

    async function load() {
      try {
        const res = await apiFetch('/api/ads/summarizeAdUsingAi', {
          method: 'POST',
          body: JSON.stringify({
            adId: listing.id,
            adTitle: listing.title,
            category: listing.category,
            subCategory: listing.subCategory,
            description: listing.description,
          }),
        });
        if (!cancelled) { setSummary(res.data); setState('done'); }
      } catch { if (!cancelled) setState('error'); }
    }
    load();
    return () => { cancelled = true; };
  }, [listing, apiFetch]);

  return (
    <div className="ai-summary-card">
      <svg width="0" height="0" className="ai-summary-gradient-defs" aria-hidden>
        <defs>
          <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285f4" />
            <stop offset="45%" stopColor="#9b72cb" />
            <stop offset="100%" stopColor="#d96570" />
          </linearGradient>
        </defs>
      </svg>
      <div className="ai-header">
        <Sparkles size={18} className="ai-icon-gemini" strokeWidth={2.25} color="url(#gemini-gradient)" aria-hidden />
        <span className="ai-header-text">AI Summary</span>
      </div>
      {state === 'loading' && (
        <div className="ai-loading">
          <div className="spinner ai-summary-spinner" style={{ width: 18, height: 18 }} />
          <span className="ai-loading-text">Analysing description…</span>
        </div>
      )}
      {state === 'error' && <div className="ai-error">Failed to load AI summary.</div>}
      {state === 'done' && summary && (
        <div className="ai-summary-rows">
          {Object.entries(summary).map(([k, v], index) => (
            <div
              key={k}
              className="ai-row ai-row--fade-in"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="ai-key">{k}</div>
              <div className="ai-val">
                {typeof v === 'object'
                  ? Object.entries(v).map(([a, b]) => `${a}: ${b}`).join(' · ')
                  : String(v)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceInsights({ listing, apiFetch }) {
  const [highest, setHighest] = useState(null);
  const [best, setBest] = useState(null);

  const formatOfferValue = (value) => {
    if (value === null || value === undefined || value === '') return '₹-';
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return '₹-';
    return `₹${numericValue.toLocaleString('en-IN')}`;
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/ai/provideAiPriceInsights', {
          method: 'POST',
          body: JSON.stringify({ adId: listing.id, category: listing.categoryId || listing.category, subCategory: listing.subCategory || 'General' }),
        });
        if (res.success && res.data?.summary) {
          const s = res.data.summary;
          setHighest(s.find(i => i.title?.includes('Highest')));
          setBest(s.find(i => i.title?.includes('Best')));
        }
      } catch { /* ignore */ }
    }
    load();
  }, [listing, apiFetch]);

  return (
    <div className="offers-row">
      <div className="offer-card">
        <div className="offer-badge">↗ Highest Offer</div>
        <div className="offer-price">{formatOfferValue(highest?.value)}</div>
        <div className="offer-desc">{highest?.description || (highest ? '' : <div className="spinner" style={{ width: 18, height: 18, margin: '8px 0' }} />)}</div>
      </div>
      <div className="offer-card">
        <div className="offer-badge orange">🏆 Best Offer</div>
        <div className="offer-price">{formatOfferValue(best?.value)}</div>
        <div className="offer-desc">{best?.description || (best ? '' : <div className="spinner" style={{ width: 18, height: 18, margin: '8px 0' }} />)}</div>
      </div>
    </div>
  );
}

function getChatInitials(name) {
  if (!name || name === 'Seller' || name === 'Buyer') return '??';
  const p = String(name).trim().split(/\s+/);
  return p.length === 1 ? p[0].substring(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatChatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function DetailChatBox({ listing, user, apiFetch, showToast, navigate }) {
  const { subscribeChatMessages } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const msgsRef = useRef(null);
  const chatInfo = { adId: listing.id, buyerId: user?._id, sellerId: listing.sellerId };
  const sellerName = listing.seller || 'Seller';

  const fetchMsgs = async (silent = false) => {
    try {
      const data = await apiFetch(`/api/ads/chat?adId=${listing.id}&sellerId=${listing.sellerId}&buyerId=${user._id}`);
      const msgs = Array.isArray(data.chats) ? data.chats : [];
      setMessages(prev => (silent ? mergeWithPending(msgs, prev) : msgs));
    } catch { /* ignore */ }
  };

  const openChat = async () => {
    if (!user) { showToast('Please sign in to chat with the seller.', 'error'); navigate('profile'); return; }
    setOpen(true);
    await fetchMsgs();
  };

  const send = async () => {
    if (!input.trim() || !user?._id) return;
    const msg = input.trim();
    const optimistic = createOptimisticMessage(msg, user._id);
    const optId = optimistic._optimisticId;
    setInput('');
    setMessages(prev => [...prev, optimistic]);
    try {
      await apiFetch('/api/ads/chat', {
        method: 'POST',
        body: JSON.stringify({ adId: listing.id, from: user._id, to: listing.sellerId, message: msg }),
      });
      await fetchMsgs(true);
    } catch {
      setMessages(prev => removeOptimistic(prev, optId));
      setInput(msg);
      showToast('Could not send message.', 'error');
    }
  };

  const handleReportUser = () => {
    confirmAndReportUser({
      apiFetch,
      showToast,
      buyerId: user?._id,
      sellerId: listing.sellerId,
      isSeller: false,
      targetName: sellerName,
    });
  };

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!open || !user?._id) return undefined;
    emitJoin(user._id);
    return subscribeChatMessages((payload) => {
      const parsed = parseChatPayload(payload);
      if (!parsed.message) return;
      if (!payloadMatchesChat(payload, chatInfo) && !payloadMatchesAd(payload, chatInfo.adId)) return;
      const fromMe = normalizeId(parsed.from) === normalizeId(user._id);
      const incoming = payloadToMessage(parsed);
      setMessages(prev => appendIncomingMessage(
        prev.filter(m => !(m._optimisticId && fromMe && m.message === incoming.message)),
        incoming,
      ));
    });
  }, [open, user?._id, listing.id, listing.sellerId, subscribeChatMessages]);

  if (!open) {
    return (
      <button type="button" className="detail-chat-launch" onClick={openChat}>
        <span className="detail-chat-launch-icon">
          <MessageCircle size={20} strokeWidth={2} />
        </span>
        <span className="detail-chat-launch-text">
          <span className="detail-chat-launch-title">Chat with seller</span>
          <span className="detail-chat-launch-sub">Message {sellerName} about this listing</span>
        </span>
        <span className="detail-chat-launch-send" aria-hidden>
          <Send size={18} />
        </span>
      </button>
    );
  }

  let lastDate = null;

  return (
    <div className="detail-chat-panel messages-chat-panel">
      <div className="messages-chat-header">
        <div className="messages-chat-header-main">
          <div className="messages-chat-header-avatar">{getChatInitials(sellerName)}</div>
          <div className="messages-chat-header-text">
            <div className="messages-chat-name">{sellerName}</div>
            {listing.title && (
              <div className="messages-chat-subtitle" title={listing.title}>{listing.title}</div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="messages-chat-report-btn"
          onClick={handleReportUser}
          aria-label="Report user"
          title="Report user"
        >
          <Flag size={16} />
        </button>
      </div>

      <div className="chat-detail-msgs detail-chat-msgs" ref={msgsRef}>
        {messages.length === 0 ? (
          <div className="messages-empty-chat">
            <MessageCircle size={28} strokeWidth={1.75} />
            <span>No messages yet — say hi!</span>
          </div>
        ) : (
          messages.map((m, i) => {
            const fromId = m.from?._id || m.from;
            const isMe = fromId === user?._id;
            let separator = null;
            if (m.createdAt) {
              const d = new Date(m.createdAt).toDateString();
              if (d !== lastDate) {
                lastDate = d;
                separator = (
                  <div key={`sep-${i}`} className="date-separator">
                    <div className="date-line" />
                    <div className="date-label">{formatChatDateLabel(m.createdAt)}</div>
                    <div className="date-line" />
                  </div>
                );
              }
            }
            return (
              <React.Fragment key={m._id || m._optimisticId || i}>
                {separator}
                <div className={`msg-bubble${isMe ? ' me' : ''}${m.pending ? ' pending' : ''}`}>
                  <div className="msg-text">{m.message}</div>
                  {m.createdAt && (
                    <div className="msg-time">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="chat-detail-input">
        <textarea
          className="messages-compose-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Write a message..."
          rows={1}
        />
        <button
          type="button"
          className="messages-send-btn"
          onClick={send}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export default function AdDetailPage() {
  const { pageExtra, navigate, user, apiFetch, showToast } = useApp();
  const listingFromNav = pageExtra.listing;
  const returnTo = pageExtra.returnTo || 'home';
  const adReturnTo = pageExtra.adReturnTo || returnTo;
  const [listing, setListing] = useState(listingFromNav || null);
  const [listingLoading, setListingLoading] = useState(!listingFromNav && !!getAdIdFromLocation());
  const [listingError, setListingError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(null);

  useEffect(() => {
    setListing(listingFromNav || null);
    setListingError('');
    if (listingFromNav) setListingLoading(false);
  }, [listingFromNav]);

  useEffect(() => {
    if (listingFromNav) return undefined;
    const adId = getAdIdFromLocation();
    if (!adId) {
      setListingLoading(false);
      setListingError('This listing could not be found.');
      return undefined;
    }
    let cancelled = false;
    setListingLoading(true);
    setListingError('');
    (async () => {
      try {
        const raw = await apiFetch(`/api/ads/${adId}`);
        if (cancelled) return;
        const mapped = mapListing(raw);
        setListing(mapped);
        window.history.replaceState({}, '', `/?ad=${encodeURIComponent(mapped.id)}`);
      } catch {
        if (!cancelled) setListingError('This listing could not be found.');
      } finally {
        if (!cancelled) setListingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingFromNav, apiFetch]);

  useEffect(() => {
    if (!user || !listing?.id) return;
    let cancelled = false;
    async function loadReviewStatus() {
      try {
        const data = await apiFetch(`/api/reviews/status/${listing.id}`);
        if (!cancelled) setReviewStatus(data);
      } catch { /* ignore */ }
    }
    loadReviewStatus();
    return () => { cancelled = true; };
  }, [user, listing?.id, apiFetch]);

  if (listingLoading) {
    return (
      <div className="detail-page">
        <div className="detail-back-bar">
          <button className="back-btn" type="button" onClick={() => navigate(returnTo)}><ArrowLeft size={18} /></button>
          <div className="detail-header-title">Loading listing…</div>
        </div>
        <div className="facebook-share-loading">Opening this ad…</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="detail-page">
        <div className="detail-back-bar">
          <button className="back-btn" type="button" onClick={() => navigate('home')}><ArrowLeft size={18} /></button>
          <div className="detail-header-title">Listing unavailable</div>
        </div>
        <div className="empty-state">
          <span className="empty-title">{listingError || 'This listing could not be found.'}</span>
          <span className="empty-sub">It may have been removed or the link is no longer valid.</span>
          <button className="submit-btn" style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }} onClick={() => navigate('home')}>
            Browse ads
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?._id && (user._id === listing.sellerId || user._id === listing.seller?._id);

  const openReport = () => {
    if (!user) {
      showToast('Please sign in to report this ad.', 'error');
      navigate('profile');
      return;
    }
    setReportOpen(true);
  };

  const openSellerProfile = () => {
    if (!listing.sellerId) return;
    navigate('seller-profile', {
      sellerId: listing.sellerId,
      sellerName: listing.seller,
      sellerPic: listing.sellerPic,
      sellerSince: listing.sellerSince,
      listing,
      adReturnTo: returnTo === 'seller-profile' ? adReturnTo : returnTo,
      returnTo: 'ad-detail',
    });
  };

  const handleShare = async () => {
    try {
      const method = await shareListing(listing);
      if (method === 'clipboard' || method === 'prompt') {
        showToast('Listing link copied. Paste it in any app to share.', 'success');
      }
    } catch {
      showToast('Could not share this listing. Copy the link from the address bar.', 'error');
    }
  };

  return (
    <div className="detail-page">
      <div className="detail-back-bar">
        <button className="back-btn" type="button" onClick={() => navigate(returnTo)}><ArrowLeft size={18} /></button>
        <div className="detail-header-title">{listing.title}</div>
        <button
          type="button"
          className="detail-share-btn"
          onClick={handleShare}
          aria-label="Share this listing"
        >
          <Share2 size={16} strokeWidth={2.25} />
          Share
        </button>
      </div>

      <div className="detail-layout">
        {/* Main column */}
        <div>
          <ImageCarousel images={listing.images} />

          <div className="detail-section">
            <div className="detail-price-row">
              <div className="detail-price">₹{Number(listing.price).toLocaleString('en-IN')}</div>
              {listing.isSold && <span className="detail-sold-badge">SOLD</span>}
              {listing.isSeeded && <SeededBadge />}
            </div>
            <div className="detail-title">{listing.title}</div>
            <div className="detail-tags">
              <div className="detail-tag"><Tag size={12} /> {listing.category}</div>
              {listing.subCategory && listing.subCategory !== 'General' && (
                <div className="detail-tag">{listing.subCategory}</div>
              )}
              {listing.isSeeded && (
                <div className="detail-tag detail-tag--seeded">Sample / seeded</div>
              )}
            </div>
            <div className="detail-meta">
              <div className="detail-meta-item"><MapPin size={14} /> {listing.location}</div>
              <div className="detail-meta-item"><Eye size={14} /> {listing.views} views</div>
              <div className="detail-meta-item"><Clock size={14} /> {listing.posted}</div>
            </div>
            <button type="button" className="detail-share-cta" onClick={handleShare}>
              <Share2 size={16} strokeWidth={2.25} />
              Share this ad
            </button>
            <GenuinityMeter views={listing.views} reports={listing.reports} embedded />
          </div>

          <div className="detail-section">
            <div className="section-title">Description</div>
            {listing.isSeeded && <SeededNotice />}
            <div className="description-text">{listing.description || 'No description provided.'}</div>
          </div>

          <AiSummary listing={listing} apiFetch={apiFetch} />

          {isOwner && <AiAnalytics listing={listing} apiFetch={apiFetch} />}

          <SimilarAds
            listing={listing}
            navigate={navigate}
            returnTo={returnTo}
          />
        </div>

        {/* Aside column */}
        <div>
          {reviewStatus?.canReview && (
            <button
              type="button"
              className={`detail-review-prompt${isOwner ? ' detail-review-prompt--owner' : ''}`}
              onClick={() => setReviewOpen(true)}
            >
              ★ Rate your experience with {reviewStatus.reviewee?.name}
            </button>
          )}

          {!isOwner && (
            <div className="detail-safety-card">
              <div className="detail-safety-header">
                <div className="detail-safety-title-row">
                  <Shield size={16} />
                  <span className="detail-safety-title">Safety Tips</span>
                </div>
                <button type="button" className="detail-safety-report" onClick={openReport}>
                  <Flag size={12} /> Report Ad
                </button>
              </div>
              <ul className="detail-safety-tips">
                {SAFETY_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
              <div className="detail-safety-seller">
                <div className="detail-safety-seller-eyebrow">Posted by</div>
                <div className="detail-safety-seller-row">
                  {listing.sellerPic
                    ? <img className="detail-safety-avatar" src={listing.sellerPic} alt={listing.seller} />
                    : <div className="detail-safety-avatar-fallback"><User size={20} /></div>}
                  <div className="detail-safety-seller-info">
                    <div className="detail-safety-seller-name">{listing.seller}</div>
                    {listing.sellerSince && (
                      <div className="detail-safety-seller-since">Member since {listing.sellerSince}</div>
                    )}
                    <SellerTrustLine
                      ratingAvg={listing.sellerRatingAvg}
                      reviewCount={listing.sellerReviewCount}
                      completedSales={listing.sellerCompletedSales}
                      badges={listing.sellerBadges}
                      trustScore={listing.sellerTrustScore}
                      size="sm"
                    />
                  </div>
                  <button
                    type="button"
                    className="detail-safety-profile-btn"
                    onClick={openSellerProfile}
                  >
                    Profile
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isOwner ? (
            <>
              <OwnerAdActions ad={listing} onAdUpdated={setListing} />
              <PriceInsights listing={listing} apiFetch={apiFetch} />
              <div className="seller-card">
                {listing.sellerPic
                  ? <img className="seller-avatar" src={listing.sellerPic} alt={listing.seller} />
                  : <div className="seller-avatar-fallback"><User size={20} /></div>}
                <div>
                  <div className="seller-label">Posted by</div>
                  <div className="seller-name">{listing.seller}</div>
                </div>
              </div>
            </>
          ) : (
            <DetailChatBox
              listing={listing}
              user={user}
              apiFetch={apiFetch}
              showToast={showToast}
              navigate={navigate}
            />
          )}
        </div>
      </div>

      {reportOpen && (
        <ReportAdModal adId={listing.id} onClose={() => setReportOpen(false)} />
      )}

      {reviewOpen && reviewStatus?.reviewee && (
        <ReviewModal
          adId={listing.id}
          adTitle={listing.title}
          revieweeName={reviewStatus.reviewee.name}
          revieweePic={reviewStatus.reviewee.profilePic}
          onClose={() => setReviewOpen(false)}
          onSubmitted={() => setReviewStatus((prev) => ({ ...prev, canReview: false, alreadyReviewed: true }))}
        />
      )}
    </div>
  );
}
