export function formatAdminDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatAdminDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatAdminDate(value);
}

export function isAnonymousActor(raw = {}) {
  const userId = raw.userId || raw.user?._id || raw.user?.id || null;
  return !userId;
}

export function actorDisplayName(raw = {}) {
  if (!isAnonymousActor(raw)) {
    return raw.name || raw.userName || raw.user?.name || raw.email || raw.userEmail || 'User';
  }
  return 'Visitor';
}

export function shortVisitorId(raw = {}) {
  const id = String(raw.visitorId || raw.sessionId || raw.id || '');
  if (!id) return '';
  return id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

const PAGE_LABELS = {
  home: 'Home',
  detail: 'Listing',
  'ad-detail': 'Listing',
  messages: 'Messages',
  chat: 'Chat',
  post: 'Post ad',
  'my-ads': 'My ads',
  profile: 'Profile',
  consent: 'Privacy',
  about: 'About',
  contact: 'Contact',
  admin: 'Admin',
  'seller-profile': 'Seller profile',
  download_app: 'Download app',
};

function downloadSourceLabel(detail) {
  switch (detail) {
    case 'home_banner':
      return 'home banner';
    case 'topbar':
      return 'top bar';
    case 'sidebar':
      return 'sidebar';
    case 'android-app':
      return 'feature banner';
    default:
      return detail || '';
  }
}

export function pageLabel(page) {
  return PAGE_LABELS[page] || page || 'the site';
}

export function activityMessage(log) {
  if (log.message) return log.message;
  const who = actorDisplayName(log);
  switch (log.type) {
    case 'visit':
      return `${who} visited the site`;
    case 'page_view':
      return `${who} opened ${pageLabel(log.page)}`;
    case 'ad_view':
      return `${who} viewed ${log.adTitle || 'a listing'}`;
    case 'login':
      return `${who} signed in`;
    case 'logout':
      return `${who} signed out`;
    case 'post_ad':
      return `${who} posted ${log.adTitle || 'an ad'}`;
    case 'edit_ad':
      return `${who} edited ${log.adTitle || 'an ad'}`;
    case 'search':
      return `${who} searched “${log.detail || ''}”`;
    case 'chat':
      return `${who} messaged about ${log.adTitle || 'a listing'}`;
    case 'report':
      return `${who} reported ${log.adTitle || 'a listing'}`;
    case 'download_page_view':
      return `${who} visited the download page`;
    case 'download_page_cta_click': {
      const source = downloadSourceLabel(log.detail);
      return `${who} opened the download page${source ? ` from ${source}` : ''}`;
    }
    case 'download_app_click':
      return `${who} clicked Download for Android`;
    default:
      return `${who} · ${log.type || 'activity'}`;
  }
}
