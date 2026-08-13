export function listingShareUrl(adId, origin = (typeof window !== 'undefined' ? window.location.origin : '')) {
  const base = String(origin || 'https://dealrapp.in').replace(/\/$/, '');
  return `${base}/ad/${encodeURIComponent(adId)}`;
}

export function listingShareText(listing) {
  const title = String(listing?.title || 'Listing on Dealr').trim();
  const priceNum = Number(listing?.price);
  const price = Number.isFinite(priceNum) ? `₹${priceNum.toLocaleString('en-IN')}` : '';
  const location = String(listing?.location || '').trim();
  const details = [price, location].filter(Boolean).join(' · ');
  return details ? `${title} — ${details}` : title;
}

export async function shareListing(listing) {
  const url = listingShareUrl(listing?.id);
  const title = String(listing?.title || 'Listing on Dealr').trim();
  const text = listingShareText(listing);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'sheet';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }

  const payload = `${text}\n${url}`;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return 'clipboard';
  }

  window.prompt('Copy this listing link', url);
  return 'prompt';
}
