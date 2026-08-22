import { getAdIdFromLocation } from './facebookShare';

function asBool(value) {
  return value === true || value === 'true';
}

export function notificationPayloadToRoute(data = {}) {
  const type = String(data.type || '');
  const adId = data.adId ? String(data.adId) : '';

  if (type === 'CHAT') {
    if (data.adId && data.buyerId && data.sellerId) {
      return {
        page: 'chat',
        extra: {
          chatInfo: {
            adId: String(data.adId),
            buyerId: String(data.buyerId),
            sellerId: String(data.sellerId),
            adTitle: data.adTitle ? String(data.adTitle) : '',
          },
          otherName: String(data.otherName || data.senderName || 'Chat'),
          isSeller: asBool(data.isSeller),
        },
      };
    }
    return { page: 'messages', extra: {} };
  }

  if (type === 'REVIEW_PROMPT') {
    return { page: 'profile', extra: {} };
  }

  if (adId) {
    return { page: 'detail', extra: {}, adId };
  }

  return null;
}

export function routeToLaunchPath(route, origin = (typeof window !== 'undefined' ? window.location.origin : '')) {
  if (!route) return '/';
  const url = new URL('/', origin || 'https://dealr.local');
  if (route.page === 'detail' && route.adId) {
    url.searchParams.set('ad', route.adId);
  } else if (route.page === 'chat' && route.extra?.chatInfo) {
    const chat = route.extra.chatInfo;
    url.searchParams.set('page', 'chat');
    url.searchParams.set('adId', chat.adId);
    url.searchParams.set('buyerId', chat.buyerId);
    url.searchParams.set('sellerId', chat.sellerId);
    if (chat.adTitle) url.searchParams.set('adTitle', chat.adTitle);
    if (route.extra.otherName) url.searchParams.set('otherName', route.extra.otherName);
    url.searchParams.set('isSeller', route.extra.isSeller ? 'true' : 'false');
  } else if (route.page && route.page !== 'home' && route.page !== 'detail') {
    url.searchParams.set('page', route.page);
  }
  return `${url.pathname}${url.search}`;
}

export function getLaunchRouteFromLocation(location = (typeof window !== 'undefined' ? window.location : { search: '' })) {
  const params = new URLSearchParams(location.search || '');
  const page = params.get('page');

  if (page === 'chat' && params.get('adId') && params.get('buyerId') && params.get('sellerId')) {
    return {
      page: 'chat',
      extra: {
        chatInfo: {
          adId: params.get('adId'),
          buyerId: params.get('buyerId'),
          sellerId: params.get('sellerId'),
          adTitle: params.get('adTitle') || '',
        },
        otherName: params.get('otherName') || 'Chat',
        isSeller: params.get('isSeller') === 'true',
      },
    };
  }

  if (page === 'messages' || page === 'profile' || page === 'my-ads' || page === 'admin') {
    return { page, extra: {} };
  }

  if (getAdIdFromLocation(location)) {
    return { page: 'detail', extra: {} };
  }

  return { page: 'home', extra: {} };
}

export function applyNotificationRoute(route, navigate) {
  if (!route?.page || typeof navigate !== 'function') return;
  if (route.page === 'detail' && route.adId) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('ad', route.adId);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}` || '/');
    } catch { /* ignore */ }
    navigate('detail', route.extra || {});
    return;
  }
  navigate(route.page, route.extra || {});
}
