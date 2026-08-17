import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send, ImagePlus, Flag, ArrowUp } from 'lucide-react';
import { confirmAndReportUser } from '../utils/reportUser';
import { useApp } from '../context/AppContext';
import { uploadChatImage } from '../utils/chatUpload';
import { createOptimisticMessage, mergeWithPending, removeOptimistic } from '../utils/chatMessages';
import {
  parseChatPayload,
  payloadToMessage,
  payloadMatchesChat,
  payloadMatchesAd,
  appendIncomingMessage,
  normalizeId,
} from '../utils/chatSocket';
import ChatTrustCaution from '../components/ChatTrustCaution';
import { getChatTrustCautionFromProfile } from '../utils/chatTrustCaution';
import { emitJoin } from '../utils/socket';
import { SkeletonConversation } from '../components/Skeleton';
import { trackChat } from '../utils/siteAnalytics';

function FraudBanner({ fraud, onClose, onReportUser }) {
  if (!fraud?.fraudIndicators?.length) return null;
  return (
    <div className="fraud-banner">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="fraud-title">⚠ Safety Insight</div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} onClick={onClose}>✕</button>
      </div>
      <div className="fraud-indicators">
        {fraud.fraudIndicators.map((ind, i) => (
          <div key={i} className="fraud-indicator-row">
            <div className="fraud-dot" />
            <div className="fraud-text">{ind}</div>
          </div>
        ))}
      </div>
      {fraud.recommendations && (
        <div className="fraud-rec-box">
          <div className="fraud-rec-label">Recommendation:</div>
          <div className="fraud-rec-text">{fraud.recommendations}</div>
        </div>
      )}
      {fraud.type !== 'SAFE' && onReportUser && (
        <button type="button" className="fraud-report-btn" onClick={onReportUser}>
          Report user
        </button>
      )}
    </div>
  );
}

export default function ChatDetailPage() {
  const { pageExtra, navigate, user, apiFetch, showToast, fetchMessageCount, subscribeChatMessages } = useApp();
  const { chatInfo, otherName, isSeller } = pageExtra;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [fraud, setFraud] = useState(null);
  const [showFraud, setShowFraud] = useState(true);
  const [counterparty, setCounterparty] = useState(null);
  const [showTrustCaution, setShowTrustCaution] = useState(true);
  const [viewerImage, setViewerImage] = useState(null);
  const msgsRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatInfoRef = useRef(chatInfo);
  const fetchMsgsRef = useRef(null);
  chatInfoRef.current = chatInfo;

  const { adId, buyerId, sellerId, adTitle } = chatInfo || {};

  const fetchMsgs = useCallback(async (silent = false) => {
    if (!adId || !buyerId || !sellerId) return;
    try {
      const data = await apiFetch(`/api/ads/chat?adId=${adId}&buyerId=${buyerId}&sellerId=${sellerId}`);
      if (data.fraudCheck) { setFraud(data.fraudCheck); setShowFraud(true); }
      if (data.counterparty) setCounterparty(data.counterparty);
      const msgs = Array.isArray(data) ? data : (Array.isArray(data.chats) ? data.chats : []);
      setMessages(prev => (silent ? mergeWithPending(msgs, prev) : msgs));
    } catch { /* ignore */ }
    finally { if (!silent) setLoading(false); }
  }, [adId, buyerId, sellerId, apiFetch]);

  fetchMsgsRef.current = fetchMsgs;

  const markSeen = async () => {
    if (!adId || !user?._id) return;
    try {
      const senderId = isSeller ? buyerId : sellerId;
      await apiFetch('/api/ads/markMessagesAsSeen', {
        method: 'POST',
        body: JSON.stringify({
          adId,
          reader: user._id,
          sender: senderId,
          buyerId,
          sellerId,
        }),
      });
      fetchMessageCount();
    } catch { /* ignore */ }
  };

  useEffect(() => {
    setShowTrustCaution(true);
  }, [counterparty?._id, adId]);

  useEffect(() => {
    setLoading(true);
    fetchMsgs();
    markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatInfo]);

  useEffect(() => {
    if (!user?._id) return undefined;
    emitJoin(user._id);
    return subscribeChatMessages((payload) => {
      const info = chatInfoRef.current;
      if (!info?.adId) return;
      const parsed = parseChatPayload(payload);
      if (!parsed.message && !parsed.imageUrl) return;

      const matchesThread = payloadMatchesChat(payload, info)
        || payloadMatchesAd(payload, info.adId);
      if (!matchesThread) return;

      const fromMe = normalizeId(parsed.from) === normalizeId(user._id);
      const incoming = payloadToMessage(parsed);
      setMessages(prev => appendIncomingMessage(
        prev.filter(m => !(m._optimisticId && fromMe && m.message === incoming.message)),
        incoming,
      ));
      if (!fromMe) markSeen();
    });
  }, [user?._id, subscribeChatMessages]);

  useEffect(() => {
    if (!adId || !buyerId || !sellerId) return undefined;
    const interval = setInterval(() => fetchMsgsRef.current?.(true), 15000);
    return () => clearInterval(interval);
  }, [adId, buyerId, sellerId]);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

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
        body: JSON.stringify({
          adId,
          from: isSeller ? sellerId : buyerId,
          to: isSeller ? buyerId : sellerId,
          message: msg,
        }),
      });
      trackChat({ id: adId, title: adTitle });
      fetchMsgs(true);
    } catch {
      setMessages(prev => removeOptimistic(prev, optId));
      setInput(msg);
      showToast('Could not send message.', 'error');
    }
  };

  const sendImage = async (file) => {
    if (!file || !user?._id || !adId) return;
    const localUrl = URL.createObjectURL(file);
    const optimistic = createOptimisticMessage('', user._id, localUrl);
    const optId = optimistic._optimisticId;
    setMessages(prev => [...prev, optimistic]);
    try {
      await uploadChatImage({
        adId,
        from: isSeller ? sellerId : buyerId,
        to: isSeller ? buyerId : sellerId,
        file,
      });
      fetchMsgs(true);
    } catch {
      setMessages(prev => removeOptimistic(prev, optId));
      showToast('Could not send photo.', 'error');
    }
  };

  const handleReportUser = () => {
    confirmAndReportUser({
      apiFetch,
      showToast,
      buyerId,
      sellerId,
      isSeller,
      targetName: otherName,
    });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  let lastDate = null;
  const trustCaution = getChatTrustCautionFromProfile(counterparty);

  return (
    <div>
      <div className="detail-back-bar chat-header-bar">
        <button className="back-btn" onClick={() => navigate('messages')}><ArrowLeft size={18} /></button>
        <div className="chat-header-info">
          <div className="detail-header-title">{otherName}</div>
          {adTitle && <div className="chat-header-subtitle">{adTitle}</div>}
        </div>
        <button
          type="button"
          className="chat-header-report-btn"
          onClick={handleReportUser}
          aria-label="Report user"
          title="Report user"
        >
          <Flag size={18} />
        </button>
      </div>

      {showTrustCaution && trustCaution.show && (
        <ChatTrustCaution
          reason={trustCaution.reason}
          onClose={() => setShowTrustCaution(false)}
        />
      )}

      <div className="chat-detail-layout">
        <div className="chat-detail-msgs" ref={msgsRef}>
          {loading
            ? <SkeletonConversation />
            : messages.length === 0
            ? <div className="chat-empty-state">No messages yet. Say hi! 👋</div>
            : messages.map((m, i) => {
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
                      <div className="date-label">{formatDate(m.createdAt)}</div>
                      <div className="date-line" />
                    </div>
                  );
                }
              }
              return (
                <React.Fragment key={m._id || m._optimisticId || i}>
                  {separator}
                  <div className={`msg-bubble${isMe ? ' me' : ''}${m.pending ? ' pending' : ''}${m.imageUrl ? ' has-image' : ''}`}>
                    {m.imageUrl && (
                      <img
                        className="msg-image"
                        src={m.imageUrl}
                        alt="attachment"
                        onClick={() => setViewerImage(m.imageUrl)}
                      />
                    )}
                    {m.message && <div className="msg-text">{m.message}</div>}
                    {m.createdAt && (
                      <div className="msg-time">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
        </div>

        {showFraud && (
          <FraudBanner
            fraud={fraud}
            onClose={() => setShowFraud(false)}
            onReportUser={handleReportUser}
          />
        )}

        <div className="chat-detail-input">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) sendImage(file);
              e.target.value = '';
            }}
          />
          <textarea
            className="form-input form-textarea"
            style={{ minHeight: 42, maxHeight: 100, padding: '10px 14px' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message..."
          />
          <button
            type="button"
            className="chat-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach photo"
          >
            <ImagePlus size={24} />
          </button>
          <button type="button" className="messages-send-btn" onClick={send} disabled={!input.trim()} aria-label="Send message">
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {viewerImage && (
        <div className="image-viewer-overlay" onClick={() => setViewerImage(null)}>
          <button className="image-viewer-close" aria-label="Close">✕</button>
          <img className="image-viewer-img" src={viewerImage} alt="attachment" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
