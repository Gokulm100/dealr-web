/**
 * Ads store locations inconsistently ("Locality,City" vs "Locality, City").
 * The listings API matches substrings, so sending the locality (or a bare
 * city/district query) is far more reliable than the spaced display name.
 */
export function formatLocationName(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  const locality = (loc.locality || '').trim();
  const city = (loc.city || '').trim();
  if (locality && city) return `${locality}, ${city}`;
  return locality || city || loc.name || '';
}

export function locationSearchHaystack(loc) {
  return [loc.name, loc.locality, loc.city, loc.district, loc.state]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterLocationsByQuery(locations, query, { limit = 12 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  const ranked = [...(locations || [])].sort((a, b) => {
    const ua = Number(a.usageCount) || 0;
    const ub = Number(b.usageCount) || 0;
    if (ub !== ua) return ub - ua;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  if (!q) return ranked.slice(0, limit);

  return ranked
    .filter((loc) => locationSearchHaystack(loc).includes(q))
    .slice(0, limit);
}

/**
 * Convert a UI filter location (display string or known place) into the
 * value that should be sent to POST /api/ads.
 */
export function toApiLocationFilter(filterLocation, locations = []) {
  const raw = String(filterLocation || '').trim();
  if (!raw) return undefined;

  const lower = raw.toLowerCase();
  const compactRaw = lower.replace(/,\s+/g, ',');

  const byName = locations.find((loc) => {
    const name = String(loc.name || '').toLowerCase();
    return name === lower || name.replace(/,\s+/g, ',') === compactRaw;
  });
  if (byName?.locality) return byName.locality.trim();

  const byLocality = locations.find(
    (loc) => String(loc.locality || '').toLowerCase() === lower,
  );
  if (byLocality?.locality) return byLocality.locality.trim();

  const byCity = locations.find(
    (loc) => String(loc.city || '').toLowerCase() === lower,
  );
  if (byCity?.city) return byCity.city.trim();

  const byDistrict = locations.find(
    (loc) => String(loc.district || '').toLowerCase() === lower,
  );
  if (byDistrict?.district) return byDistrict.district.trim();

  // Free-text "Locality, City" → prefer locality for matching stored ads
  if (raw.includes(',')) {
    const locality = raw.split(',')[0].trim();
    if (locality) return locality;
  }

  return raw;
}
