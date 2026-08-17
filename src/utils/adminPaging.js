export const ADMIN_LIST_LIMIT = 20;
export const ADMIN_ACTIVITY_LIMIT = 40;

export function parseAdminPage(res = {}, { page = 1, limit = ADMIN_LIST_LIMIT, itemCount = 0 } = {}) {
  const parsedLimit = Math.max(1, Math.min(100, Number(res.limit) || limit || ADMIN_LIST_LIMIT));
  const parsedPage = Math.max(1, Number(res.page) || page || 1);
  const total = Math.max(0, Number(res.total) || 0);
  const reportedPages = Number(res.totalPages);
  const totalPages = Number.isFinite(reportedPages)
    ? Math.max(0, reportedPages)
    : (total === 0 ? 0 : Math.ceil(total / parsedLimit));
  const hasMore = typeof res.hasMore === 'boolean'
    ? res.hasMore
    : (totalPages > 0 ? parsedPage < totalPages : parsedPage * parsedLimit < total);
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
