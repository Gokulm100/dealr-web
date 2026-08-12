const SHARE_ENDPOINT = '/api/facebook/share-ad';

export function extractCreatedAdId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload._id
    || payload.id
    || payload.data?._id
    || payload.data?.id
    || payload.ad?._id
    || payload.ad?.id
    || null
  );
}

export function getAdIdFromLocation(location = window.location) {
  try {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('ad');
    if (fromQuery) return fromQuery;
    const match = String(location.pathname || '').match(/^\/ad\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function getFacebookShareStatus() {
  try {
    const res = await fetch(SHARE_ENDPOINT, { method: 'GET' });
    if (!res.ok) return { configured: false };
    const body = await res.json().catch(() => ({}));
    return { configured: !!body.configured };
  } catch {
    return { configured: false };
  }
}

export async function shareAdToFacebook(adId, token) {
  const res = await fetch(SHARE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ adId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || 'Could not share this ad to Facebook.');
  }
  return body;
}
