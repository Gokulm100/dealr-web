const RECENT_KEY = 'dealr-recent-searches';
const MAX_RECENT = 6;

export function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s.trim()).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return loadRecentSearches();
  const next = [q, ...loadRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore quota */ }
  return next;
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch { /* ignore */ }
  return [];
}

function normalize(s) {
  return String(s || '').toLowerCase().trim();
}

function subName(sub) {
  return typeof sub === 'string' ? sub : sub?.name || '';
}

/**
 * Build ranked autocomplete groups from local category + location data.
 * Types: recent | category | subcategory | location | query
 */
export function buildSearchSuggestions({
  query,
  categories = [],
  locations = [],
  recent = [],
  limit = 8,
}) {
  const q = normalize(query);
  const items = [];

  if (!q) {
    recent.forEach((text) => {
      items.push({
        id: `recent:${text}`,
        type: 'recent',
        label: text,
        meta: 'Recent',
        value: text,
      });
    });
    categories.slice(0, 4).forEach((cat) => {
      items.push({
        id: `cat:${cat.id}`,
        type: 'category',
        label: cat.name,
        meta: 'Category',
        value: cat.name,
        categoryId: cat.id,
        categoryName: cat.name,
        subCategories: cat.subCategories || [],
      });
    });
    return items.slice(0, limit);
  }

  recent.forEach((text) => {
    if (normalize(text).includes(q)) {
      items.push({
        id: `recent:${text}`,
        type: 'recent',
        label: text,
        meta: 'Recent',
        value: text,
      });
    }
  });

  categories.forEach((cat) => {
    if (normalize(cat.name).includes(q)) {
      items.push({
        id: `cat:${cat.id}`,
        type: 'category',
        label: cat.name,
        meta: 'Category',
        value: cat.name,
        categoryId: cat.id,
        categoryName: cat.name,
        subCategories: cat.subCategories || [],
      });
    }
    (cat.subCategories || []).forEach((sub) => {
      const name = subName(sub);
      if (!name) return;
      if (normalize(name).includes(q) || normalize(`${cat.name} ${name}`).includes(q)) {
        items.push({
          id: `sub:${cat.id}:${name}`,
          type: 'subcategory',
          label: name,
          meta: cat.name,
          value: name,
          categoryId: cat.id,
          categoryName: cat.name,
          subCategory: name,
          subCategories: cat.subCategories || [],
        });
      }
    });
  });

  locations.forEach((loc) => {
    const hay = normalize([loc.name, loc.locality, loc.city, loc.district].filter(Boolean).join(' '));
    if (hay.includes(q)) {
      items.push({
        id: `loc:${loc.id || loc.name}`,
        type: 'location',
        label: loc.name,
        meta: loc.district ? `${loc.district}, Kerala` : 'Location',
        value: loc.name,
        location: loc.name,
      });
    }
  });

  // Always offer a free-text search action when typing
  const hasExactQuery = items.some((i) => i.type === 'query' || normalize(i.label) === q);
  if (!hasExactQuery) {
    items.unshift({
      id: `query:${q}`,
      type: 'query',
      label: query.trim(),
      meta: 'Search listings',
      value: query.trim(),
    });
  }

  // De-dupe by id, keep order, cap
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, limit);
}
