const API = process.env.API_BASE_URL
  || process.env.REACT_APP_API_BASE_URL
  || 'https://e4u-backend.onrender.com';

const APP_URL = (process.env.PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://dealrapp.in')).replace(/\/$/, '');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripSeeded(description) {
  return String(description || '')
    .replace(/\[dealr-seeded\]/gi, '')
    .replace(/\s*\[Demo\]\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) return '';
  return `₹${n.toLocaleString('en-IN')}`;
}

function firstImage(ad) {
  const images = Array.isArray(ad?.images) ? ad.images : [];
  const url = images.find((src) => /^https?:\/\//i.test(String(src || '')));
  return url || `${APP_URL}/favicon.png`;
}

function sendHtml(res, status, html) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(html);
}

function pageHtml({ title, description, image, canonical, appLink }) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const url = escapeHtml(canonical);
  const href = escapeHtml(appLink);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Dealr" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:url" content="${url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />
</head>
<body>
  <p>Opening this listing on Dealr…</p>
  <p><a href="${href}">Continue to Dealr</a></p>
  <script>window.location.replace(${JSON.stringify(appLink)});</script>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  const rawId = req.query?.id;
  const adId = String(Array.isArray(rawId) ? rawId[0] : (rawId || '')).trim();
  const appLink = adId ? `${APP_URL}/?ad=${encodeURIComponent(adId)}` : `${APP_URL}/`;

  if (!adId) {
    sendHtml(res, 400, pageHtml({
      title: 'Dealr',
      description: 'Deal with the Right App!',
      image: `${APP_URL}/favicon.png`,
      canonical: APP_URL,
      appLink: `${APP_URL}/`,
    }));
    return;
  }

  try {
    const adRes = await fetch(`${API}/api/ads/${encodeURIComponent(adId)}`);
    if (!adRes.ok) {
      sendHtml(res, adRes.status === 404 ? 404 : 502, pageHtml({
        title: 'Listing on Dealr',
        description: 'This listing is unavailable. Browse more ads on Dealr.',
        image: `${APP_URL}/favicon.png`,
        canonical: `${APP_URL}/ad/${encodeURIComponent(adId)}`,
        appLink,
      }));
      return;
    }

    const ad = await adRes.json();
    const price = formatPrice(ad.price);
    const location = ad.location || '';
    const category = ad.category?.name || ad.category || '';
    const snippet = stripSeeded(ad.description).slice(0, 180);
    const description = [price, location, category, snippet].filter(Boolean).join(' · ');

    sendHtml(res, 200, pageHtml({
      title: ad.title ? `${ad.title} | Dealr` : 'Listing on Dealr',
      description: description || 'A local listing on Dealr.',
      image: firstImage(ad),
      canonical: `${APP_URL}/ad/${encodeURIComponent(adId)}`,
      appLink,
    }));
  } catch {
    sendHtml(res, 502, pageHtml({
      title: 'Dealr',
      description: 'Deal with the Right App!',
      image: `${APP_URL}/favicon.png`,
      canonical: `${APP_URL}/ad/${encodeURIComponent(adId)}`,
      appLink,
    }));
  }
};
