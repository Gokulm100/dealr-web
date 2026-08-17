export const ADMIN_LIST_LIMIT = 10;
export const ADMIN_ACTIVITY_LIMIT = 10;

function readMeta(res = {}) {
  const nested = res.pagination && typeof res.pagination === 'object' ? res.pagination : null;
  const data = res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null;
  return nested || data || res;
}

export function parseAdminPage(res = {}, { page = 1, limit = ADMIN_LIST_LIMIT, itemCount = 0 } = {}) {
  const meta = readMeta(res);
  const parsedLimit = Math.max(1, Math.min(100, Number(limit) || Number(meta.limit) || Number(res.limit) || ADMIN_LIST_LIMIT));
  const parsedPage = Math.max(1, Number(meta.page) || Number(res.page) || page || 1);
  const rawTotal = meta.total ?? res.total ?? res.count ?? meta.count;
  const hasExplicitTotal = rawTotal != null && rawTotal !== '' && Number.isFinite(Number(rawTotal));
  const total = hasExplicitTotal ? Math.max(0, Number(rawTotal)) : 0;
  const reportedPages = Number(meta.totalPages ?? res.totalPages);
  const totalPages = Number.isFinite(reportedPages)
    ? Math.max(0, reportedPages)
    : (total === 0 ? 0 : Math.ceil(total / parsedLimit));
  const explicitHasMore = meta.hasMore ?? res.hasMore;
  const inferredHasMore = total > 0
    ? parsedPage * parsedLimit < total
    : itemCount >= parsedLimit;
  const hasMore = typeof explicitHasMore === 'boolean' ? explicitHasMore : inferredHasMore;
  return {
    page: parsedPage,
    limit: parsedLimit,
    total,
    totalPages,
    hasMore,
    itemCount,
  };
}

export function pageRangeLabel({ page, limit, total }) {
  if (!total) return '0 items';
  const start = (Math.max(1, page) - 1) * Math.max(1, limit) + 1;
  const end = Math.min(page * limit, total);
  return `${start}–${end} of ${total}`;
}

export function shouldStepBackEmptyPage(items, page) {
  return page > 1 && Array.isArray(items) && items.length === 0;
}

export function createRequestSeq() {
  let current = 0;
  return {
    begin() {
      current += 1;
      return current;
    },
    isCurrent(id) {
      return id === current;
    },
  };
}
