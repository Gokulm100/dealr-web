import React from 'react';
import { pageRangeLabel } from '../../utils/adminPaging';

export default function AdminPager({
  page = 1,
  limit = 10,
  total = 0,
  totalPages = 0,
  hasMore = false,
  onPageChange,
  disabled = false,
}) {
  const atStart = page <= 1;
  const atEnd = totalPages > 0 ? page >= totalPages : !hasMore;
  const empty = total === 0 && !hasMore && page <= 1;

  if (empty) {
    return (
      <div className="admin-pager">
        <span className="admin-pager-label">0 items</span>
      </div>
    );
  }

  return (
    <div className="admin-pager">
      <span className="admin-pager-label">
        {total > 0 ? pageRangeLabel({ page, limit, total }) : `Page ${page}`}
      </span>
      <div className="admin-pager-controls">
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          disabled={disabled || atStart}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span className="admin-pager-page">
          {totalPages > 0 ? `Page ${page} of ${totalPages}` : `Page ${page}`}
        </span>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          disabled={disabled || atEnd}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
