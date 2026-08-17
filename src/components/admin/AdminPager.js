import React from 'react';
import { pageRangeLabel } from '../../utils/adminPaging';

export default function AdminPager({
  page = 1,
  limit = 20,
  total = 0,
  totalPages = 0,
  hasMore = false,
  onPageChange,
  disabled = false,
}) {
  const atStart = page <= 1;
  const atEnd = !hasMore || (totalPages > 0 && page >= totalPages);

  if (total === 0) {
    return (
      <div className="admin-pager">
        <span className="admin-pager-label">0 items</span>
      </div>
    );
  }

  return (
    <div className="admin-pager">
      <span className="admin-pager-label">{pageRangeLabel({ page, limit, total })}</span>
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
          Page {page} of {totalPages}
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
