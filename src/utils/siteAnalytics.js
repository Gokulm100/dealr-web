/**
 * Lightweight site analytics: anonymous visitor IDs, session visits,
 * page/ad views, and activity events posted to POST /api/analytics/track.
 */
const VISITOR_KEY = 'dealr_visitor_id';
const SESSION_KEY = 'dealr_session_id';
const SESSION_AT_KEY = 'dealr_session_at';
const QUEUE_KEY = 'dealr_analytics_queue';
const SESSION_GAP_MS = 30 * 60 * 1000;
const FLUSH_MS = 2500;
const MAX_QUEUE = 80;
const AD_VIEW_DEBOUNCE_MS = 10 * 60 * 1000;

let apiBase = '';
let flushTimer = null;
let started = false;
let adViewMemory = new Map();

function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota / private mode */ }
}

export function getVisitorId() {
  let id = '';
  try { id = localStorage.getItem(VISITOR_KEY) || ''; } catch { /* ignore */ }
  if (!id) {
    id = uuid();
    try { localStorage.setItem(VISITOR_KEY, id); } catch { /* ignore */ }
  }
  return id;
}

export function getSessionId() {
  const now = Date.now();
  let sessionId = '';
  let lastAt = 0;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) || '';
    lastAt = Number(sessionStorage.getItem(SESSION_AT_KEY) || 0);
  } catch { /* ignore */ }
  if (!sessionId || !lastAt || now - lastAt > SESSION_GAP_MS) {
    sessionId = uuid();
    lastAt = now;
    try {
      sessionStorage.setItem(SESSION_KEY, sessionId);
      sessionStorage.setItem(SESSION_AT_KEY, String(lastAt));
    } catch { /* ignore */ }
    return { sessionId, isNew: true };
  }
  try { sessionStorage.setItem(SESSION_AT_KEY, String(now)); } catch { /* ignore */ }
  return { sessionId, isNew: false };
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function actorFields() {
  const user = currentUser();
  const { sessionId } = getSessionId();
  return {
    visitorId: getVisitorId(),
    sessionId,
    userId: user?._id || user?.id || null,
    userName: user?.name || null,
    userEmail: user?.email || null,
  };
}

function enqueue(event) {
  const queue = readJson(QUEUE_KEY, []);
  queue.push(event);
  writeJson(QUEUE_KEY, queue.slice(-MAX_QUEUE));
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, FLUSH_MS);
}

async function flushQueue({ keepalive = false } = {}) {
  if (!apiBase) return;
  const queue = readJson(QUEUE_KEY, []);
  if (!queue.length) return;
  writeJson(QUEUE_KEY, []);
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : '';
  const headers = { 'Content-Type': 'application/json' };
  if (token && token !== 'null') headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${apiBase}/api/analytics/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: queue }),
      keepalive,
    });
    if (!res.ok) {
      const existing = readJson(QUEUE_KEY, []);
      writeJson(QUEUE_KEY, [...queue, ...existing].slice(-MAX_QUEUE));
    }
  } catch {
    const existing = readJson(QUEUE_KEY, []);
    writeJson(QUEUE_KEY, [...queue, ...existing].slice(-MAX_QUEUE));
  }
}

export function trackEvent(type, extra = {}) {
  if (typeof window === 'undefined') return;
  const event = {
    type,
    ...actorFields(),
    page: extra.page || null,
    adId: extra.adId || extra.id || null,
    adTitle: extra.adTitle || extra.title || null,
    detail: extra.detail || extra.query || extra.message || null,
    path: `${window.location.pathname}${window.location.search}`,
    createdAt: new Date().toISOString(),
  };
  enqueue(event);
}

export function trackVisit() {
  const { isNew } = getSessionId();
  if (isNew) trackEvent('visit');
}

export function trackPageView(page, extra = {}) {
  if (!page) return;
  trackEvent('page_view', { page, ...extra });
}

export function trackAdView(listing = {}) {
  const adId = listing.id || listing._id;
  if (!adId) return;
  const now = Date.now();
  const last = adViewMemory.get(adId) || 0;
  if (now - last < AD_VIEW_DEBOUNCE_MS) return;
  adViewMemory.set(adId, now);
  trackEvent('ad_view', {
    page: 'detail',
    adId,
    adTitle: listing.title || '',
  });
}

export function trackLogin() {
  trackEvent('login', { page: 'profile' });
}

export function trackLogout() {
  trackEvent('logout', { page: 'profile' });
}

export function trackPostAd(listing = {}, { edited = false } = {}) {
  trackEvent(edited ? 'edit_ad' : 'post_ad', {
    page: 'post',
    adId: listing.id || listing._id || listing.adId,
    adTitle: listing.title,
  });
}

export function trackSearch(query) {
  const detail = String(query || '').trim();
  if (detail.length < 2) return;
  trackEvent('search', { page: 'home', detail });
}

export function trackChat(listing = {}) {
  trackEvent('chat', {
    page: 'chat',
    adId: listing.id || listing.adId,
    adTitle: listing.title || listing.adTitle,
  });
}

export function trackReport(listing = {}) {
  trackEvent('report', {
    page: 'detail',
    adId: listing.id || listing.adId,
    adTitle: listing.title || listing.adTitle,
  });
}

export function initSiteAnalytics(base) {
  apiBase = String(base || '').replace(/\/$/, '');
  if (started || typeof window === 'undefined') return;
  started = true;
  getVisitorId();
  trackVisit();
  const onHide = () => flushQueue({ keepalive: true });
  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
}

export function flushAnalytics() {
  return flushQueue({ keepalive: true });
}
