import React from 'react';
import { Beaker } from 'lucide-react';

const TITLE =
  'This listing was seeded for demo/testing. It may not be a real offer.';

/** Compact badge for cards and detail tags. */
export default function SeededBadge({ size = 'md', className = '' }) {
  const iconSize = size === 'sm' ? 11 : 13;
  return (
    <span
      className={`seeded-badge seeded-badge--${size} ${className}`.trim()}
      title={TITLE}
      aria-label="Demo listing — seeded sample data"
    >
      <Beaker size={iconSize} strokeWidth={2.25} aria-hidden />
      Demo listing
    </span>
  );
}

/** Longer notice used on the ad detail page. */
export function SeededNotice() {
  return (
    <div className="seeded-notice" role="note">
      <Beaker size={16} strokeWidth={2.25} aria-hidden />
      <div>
        <strong>Demo / seeded data</strong>
        <p>
          This listing was added for testing browse, search, and filters. Treat it as sample
          content — not a confirmed real-world offer.
        </p>
      </div>
    </div>
  );
}
