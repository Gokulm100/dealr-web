const API = process.env.API_BASE_URL
  || process.env.REACT_APP_API_BASE_URL
  || 'https://e4u-backend.onrender.com';

const APP_URL = (process.env.PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://dealrapp.in')).replace(/\/$/, '');

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || 'v21.0';

function isConfigured() {
  return Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
}

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Vary', 'Origin');
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token).split('.')[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function sellerIdOf(ad) {
  if (!ad?.seller) return '';
  if (typeof ad.seller === 'string') return ad.seller;
  return String(ad.seller._id || ad.seller.id || '');
}

function stripSeeded(description) {
  return String(description || '')
    .replace(/\[dealr-seeded\]/gi, '')
    .replace(/\s*\[Demo\]\s*$/i, '')
    .trim();
}

function isSeeded(description) {
  return /\[dealr-seeded\]/i.test(String(description || ''));
}

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '';
  return `₹${n.toLocaleString('en-IN')}`;
}

function usableImage(url) {
  if (!url || typeof url !== 'string') return '';
  if (!/^https?:\/\//i.test(url)) return '';
  if (/pexels\.com/i.test(url)) return '';
  return url;
}

function composeCaption(ad, link) {
  const title = String(ad.title || 'New listing on Dealr').trim();
  const price = formatPrice(ad.price);
  const location = String(ad.location || '').trim();
  const category = ad.category?.name || (typeof ad.category === 'string' ? ad.category : '');
  const sub = String(ad.subCategory || '').trim();
  const categoryLine = [category, sub && sub !== 'General' ? sub : ''].filter(Boolean).join(' · ');
  const snippet = stripSeeded(ad.description).replace(/\s+/g, ' ').slice(0, 220);
  return [
    title,
    [price, location].filter(Boolean).join(' · '),
    categoryLine,
    snippet,
    `View on Dealr: ${link}`,
  ].filter(Boolean).join('\n\n');
}

async function verifyUserToken(token) {
  const res = await fetch(`${API}/api/reviews/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const payload = decodeJwtPayload(token);
  return payload?.id ? String(payload.id) : null;
}

async function fetchAd(adId) {
  const load = async () => {
    const res = await fetch(`${API}/api/ads/${encodeURIComponent(adId)}`);
    if (res.status === 404) return { missing: true };
    if (!res.ok) throw new Error('Could not load this ad.');
    return { ad: await res.json() };
  };

  let result = await load();
  if (!result.missing && listingImages(result.ad).length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    result = await load();
  }
  return result;
}

async function graphPostJson(path, body) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function graphPostForm(path, params) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    body.append(key, String(value));
  });
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function listingImages(ad) {
  const images = Array.isArray(ad?.images) ? ad.images : [];
  return [...new Set(images.map(usableImage).filter(Boolean))].slice(0, 8);
}

async function uploadUnpublishedPhoto(pageId, accessToken, imageUrl) {
  const viaUrl = await graphPostForm(`${pageId}/photos`, {
    url: imageUrl,
    published: 'false',
    access_token: accessToken,
  });
  if (viaUrl.ok && viaUrl.data.id) return String(viaUrl.data.id);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const contentType = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const form = new FormData();
  form.append('published', 'false');
  form.append('access_token', accessToken);
  form.append('source', new Blob([buf], { type: contentType }), `listing.${ext}`);

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.id ? String(data.id) : null;
}

async function postFeedWithMedia({ pageId, accessToken, message, mediaIds, asDraft }) {
  const params = {
    message,
    published: asDraft ? 'false' : 'true',
    access_token: accessToken,
  };
  if (asDraft) params.unpublished_content_type = 'DRAFT';
  mediaIds.forEach((id, index) => {
    params[`attached_media[${index}]`] = JSON.stringify({ media_fbid: id });
  });
  return graphPostForm(`${pageId}/feed`, params);
}

async function postToFacebookPage({ message, ad, link }) {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const images = listingImages(ad);

  // Facebook draft-with-images: upload unpublished photos, then attach them
  // to a Business Suite DRAFT so the listing photos are in the post.
  const mediaIds = [];
  for (const imageUrl of images) {
    try {
      const photoId = await uploadUnpublishedPhoto(pageId, accessToken, imageUrl);
      if (photoId) mediaIds.push(photoId);
    } catch { /* try the next photo */ }
  }

  if (mediaIds.length) {
    const draft = await postFeedWithMedia({
      pageId,
      accessToken,
      message,
      mediaIds,
      asDraft: true,
    });
    if (draft.ok && draft.data.id) {
      return { type: 'draft', id: draft.data.id, photoCount: mediaIds.length };
    }

    const live = await postFeedWithMedia({
      pageId,
      accessToken,
      message,
      mediaIds,
      asDraft: false,
    });
    if (live.ok && live.data.id) {
      return { type: 'photos', id: live.data.id, photoCount: mediaIds.length };
    }
  }

  const textDraft = await graphPostForm(`${pageId}/feed`, {
    message,
    published: 'false',
    unpublished_content_type: 'DRAFT',
    access_token: accessToken,
  });
  if (textDraft.ok && textDraft.data.id) {
    return { type: 'draft', id: textDraft.data.id, photoCount: 0 };
  }

  if (images[0]) {
    const photo = await graphPostJson(`${pageId}/photos`, {
      url: images[0],
      caption: message,
      published: true,
      access_token: accessToken,
    });
    if (photo.ok && (photo.data.id || photo.data.post_id)) {
      return { type: 'photo', id: photo.data.post_id || photo.data.id };
    }
  }

  const feed = await graphPostJson(`${pageId}/feed`, {
    message,
    link,
    access_token: accessToken,
  });
  if (!feed.ok) {
    throw new Error(feed.data?.error?.message || 'Facebook rejected this post.');
  }
  return { type: 'feed', id: feed.data.id };
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    sendJson(res, 200, { configured: isConfigured() });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }

  if (!isConfigured()) {
    sendJson(res, 503, {
      configured: false,
      message: 'Dealr Facebook page sharing is not connected yet.',
    });
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    sendJson(res, 401, { message: 'Please sign in to share an ad.' });
    return;
  }

  const adId = String(readJsonBody(req).adId || '').trim();
  if (!adId) {
    sendJson(res, 400, { message: 'Missing ad id.' });
    return;
  }

  try {
    const userId = await verifyUserToken(token);
    if (!userId) {
      sendJson(res, 401, { message: 'Please sign in to share an ad.' });
      return;
    }

    const { missing, ad } = await fetchAd(adId);
    if (missing || !ad) {
      sendJson(res, 404, { message: 'Ad not found.' });
      return;
    }

    if (sellerIdOf(ad) !== userId) {
      sendJson(res, 403, { message: 'You can only share ads you posted.' });
      return;
    }

    if (ad.isSold) {
      sendJson(res, 400, { message: 'Sold ads cannot be shared to Facebook.' });
      return;
    }

    if (ad.isActive === false) {
      sendJson(res, 400, { message: 'Disabled ads cannot be shared to Facebook.' });
      return;
    }

    if (isSeeded(ad.description)) {
      sendJson(res, 400, { message: 'Demo listings are not shared to Facebook.' });
      return;
    }

    const link = `${APP_URL}/ad/${encodeURIComponent(adId)}`;
    const posted = await postToFacebookPage({
      message: composeCaption(ad, link),
      ad,
      link,
    });

    sendJson(res, 200, {
      success: true,
      facebookPostId: posted.id,
      type: posted.type,
      photoCount: posted.photoCount || 0,
    });
  } catch (err) {
    sendJson(res, 502, { message: err.message || 'Could not share this ad to Facebook.' });
  }
};
