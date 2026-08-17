/**
 * Admin API — expects backend routes under /api/admin (admin JWT required)
 * and public POST /api/analytics/track for visitor/activity events.
 * Adjust paths here if your backend uses different names.
 */
const ADMIN = '/api/admin';

function normalizeList(res, keys = ['data', 'users', 'reports', 'items', 'results']) {
  if (Array.isArray(res)) return res;
  for (const key of keys) {
    if (Array.isArray(res?.[key])) return res[key];
  }
  return [];
}

export function mapAdminUser(raw) {
  return {
    id: raw._id || raw.id,
    name: raw.name || 'Unknown',
    email: raw.email || '',
    profilePic: raw.profilePic || null,
    isActive: raw.isActive !== false,
    isAdmin: !!raw.isAdmin,
    createdAt: raw.createdAt || null,
    reportCounter: raw.reportCounter ?? 0,
  };
}

export function mapAdminReport(raw) {
  const reporter = raw.reporter || raw.reportedBy || {};
  const target = raw.reportedUser || raw.targetUser || raw.user || {};
  const ad = raw.ad || raw.adId || {};
  return {
    id: raw._id || raw.id,
    reason: raw.reason || raw.type || 'Report',
    description: raw.description || raw.message || raw.details || '',
    status: raw.status || 'pending',
    createdAt: raw.createdAt || null,
    reporterId: reporter._id || reporter.id || raw.reporterId,
    reporterName: reporter.name || raw.reporterName || 'Unknown',
    reporterEmail: reporter.email || raw.reporterEmail || '',
    targetUserId: target._id || target.id || raw.reportedUserId || raw.targetUserId,
    targetUserName: target.name || raw.reportedUserName || 'Unknown',
    targetUserEmail: target.email || '',
    adId: ad._id || ad.id || (typeof raw.adId === 'string' ? raw.adId : null),
    adTitle: ad.title || raw.adTitle || '',
  };
}

export async function fetchAdminUsers(apiFetch) {
  const res = await apiFetch(`${ADMIN}/getUsers`, { method: 'POST', body: JSON.stringify({}) });
  return normalizeList(res, ['data', 'users']).map(mapAdminUser);
}

export async function setUserActive(apiFetch, userId, isActive) {
  return apiFetch(`${ADMIN}/setUserActive`, {
    method: 'POST',
    body: JSON.stringify({ userId, isActive }),
  });
}

export async function fetchAdminReports(apiFetch, status = 'pending') {
  const res = await apiFetch(`${ADMIN}/getReports`, {
    method: 'POST',
    body: JSON.stringify({ status: status === 'all' ? undefined : status }),
  });
  return normalizeList(res, ['data', 'reports']).map(mapAdminReport);
}

export async function updateReportStatus(apiFetch, reportId, status, adminNote = '') {
  return apiFetch(`${ADMIN}/updateReport`, {
    method: 'POST',
    body: JSON.stringify({ reportId, status, adminNote }),
  });
}

export async function fetchPendingReportCount(apiFetch) {
  try {
    const reports = await fetchAdminReports(apiFetch, 'pending');
    return reports.filter(r => r.status === 'pending').length;
  } catch {
    return 0;
  }
}

function mapViewer(raw = {}) {
  const user = raw.user || raw.viewer || {};
  const userId = raw.userId || user._id || user.id || null;
  return {
    id: raw._id || raw.id || userId || raw.visitorId || `${raw.lastViewedAt || ''}-${raw.email || ''}`,
    userId,
    visitorId: raw.visitorId || raw.sessionId || null,
    name: user.name || raw.name || raw.userName || '',
    email: user.email || raw.email || raw.userEmail || '',
    profilePic: user.profilePic || raw.profilePic || null,
    isVisitor: !userId,
    viewCount: Number(raw.viewCount ?? raw.views ?? raw.count ?? 1) || 1,
    lastViewedAt: raw.lastViewedAt || raw.updatedAt || raw.createdAt || null,
  };
}

function mapAdViewers(raw = {}) {
  const ad = raw.ad || raw.listing || {};
  const viewersRaw = Array.isArray(raw.viewers)
    ? raw.viewers
    : Array.isArray(raw.users)
      ? raw.users
      : Array.isArray(raw.views)
        ? raw.views
        : [];
  const mappedViewers = viewersRaw
    .map(mapViewer)
    .sort((a, b) => new Date(b.lastViewedAt || 0) - new Date(a.lastViewedAt || 0));
  const views = Number(raw.views ?? raw.viewCount ?? ad.views ?? mappedViewers.reduce((n, v) => n + v.viewCount, 0)) || 0;
  return {
    id: raw._id || raw.id || raw.adId || ad._id || ad.id,
    title: raw.title || ad.title || 'Untitled listing',
    image: (Array.isArray(raw.images) && raw.images[0]) || (Array.isArray(ad.images) && ad.images[0]) || raw.image || ad.image || null,
    views,
    uniqueViewers: Number(raw.uniqueViewers ?? raw.uniqueViews ?? mappedViewers.length) || mappedViewers.length,
    lastViewedAt: raw.lastViewedAt || mappedViewers[0]?.lastViewedAt || null,
    viewers: mappedViewers,
  };
}

export function mapSiteVisitor(raw = {}) {
  const user = raw.user || {};
  const userId = raw.userId || user._id || user.id || null;
  return {
    id: raw._id || raw.id || raw.visitorId || userId,
    visitorId: raw.visitorId || raw.sessionId || null,
    userId,
    name: user.name || raw.name || raw.userName || '',
    email: user.email || raw.email || raw.userEmail || '',
    profilePic: user.profilePic || raw.profilePic || null,
    isVisitor: !userId,
    firstSeenAt: raw.firstSeenAt || raw.createdAt || null,
    lastSeenAt: raw.lastSeenAt || raw.updatedAt || raw.createdAt || null,
    pageViews: Number(raw.pageViews ?? raw.pages ?? 0) || 0,
    adViews: Number(raw.adViews ?? raw.adViewCount ?? 0) || 0,
    lastPage: raw.lastPage || raw.page || '',
  };
}

export function mapActivityLog(raw = {}) {
  const user = raw.user || raw.actor || {};
  const ad = raw.ad || {};
  const userId = raw.userId || user._id || user.id || null;
  return {
    id: raw._id || raw.id || `${raw.createdAt || ''}-${raw.type || ''}-${raw.visitorId || userId || ''}`,
    type: raw.type || raw.action || raw.event || 'activity',
    userId,
    visitorId: raw.visitorId || raw.sessionId || null,
    name: user.name || raw.name || raw.userName || '',
    email: user.email || raw.email || raw.userEmail || '',
    profilePic: user.profilePic || raw.profilePic || null,
    isVisitor: !userId,
    page: raw.page || '',
    adId: raw.adId || ad._id || ad.id || null,
    adTitle: raw.adTitle || ad.title || '',
    detail: typeof raw.detail === 'string' ? raw.detail : (typeof raw.query === 'string' ? raw.query : ''),
    message: raw.message || raw.description || '',
    createdAt: raw.createdAt || raw.timestamp || raw.time || null,
  };
}

export async function fetchAdminAdViewers(apiFetch) {
  const res = await apiFetch(`${ADMIN}/getAdViewers`, { method: 'POST', body: JSON.stringify({}) });
  const ads = normalizeList(res, ['ads', 'listings', 'data', 'items', 'results']).map(mapAdViewers);
  const stats = res?.stats || res?.summary || {};
  return {
    ads,
    stats: {
      totalViews: Number(stats.totalViews ?? ads.reduce((n, a) => n + a.views, 0)) || 0,
      uniqueViewers: Number(stats.uniqueViewers ?? ads.reduce((n, a) => n + a.uniqueViewers, 0)) || 0,
      adsViewed: Number(stats.adsViewed ?? ads.length) || ads.length,
    },
  };
}

export async function fetchAdminVisitors(apiFetch) {
  const res = await apiFetch(`${ADMIN}/getVisitors`, { method: 'POST', body: JSON.stringify({}) });
  const visitors = normalizeList(res, ['visitors', 'data', 'users', 'items', 'results']).map(mapSiteVisitor);
  const stats = res?.stats || res?.summary || {};
  const signedIn = visitors.filter(v => !v.isVisitor).length;
  return {
    visitors,
    stats: {
      total: Number(stats.total ?? stats.count ?? visitors.length) || visitors.length,
      signedIn: Number(stats.signedIn ?? stats.users ?? signedIn) || signedIn,
      anonymous: Number(stats.anonymous ?? stats.visitors ?? (visitors.length - signedIn)) || Math.max(0, visitors.length - signedIn),
    },
  };
}

export async function fetchAdminActivityLog(apiFetch, { page = 1, limit = 40, type } = {}) {
  const res = await apiFetch(`${ADMIN}/getActivityLog`, {
    method: 'POST',
    body: JSON.stringify({ page, limit, type: type && type !== 'all' ? type : undefined }),
  });
  const logs = normalizeList(res, ['logs', 'activities', 'events', 'data', 'items', 'results']).map(mapActivityLog);
  return {
    logs,
    page: Number(res?.page) || page,
    total: Number(res?.total ?? res?.count ?? logs.length) || logs.length,
    hasMore: Boolean(res?.hasMore ?? ((Number(res?.page) || page) * limit < (Number(res?.total) || 0))),
  };
}
