import React, { useEffect, useRef, useState } from 'react';
import { Megaphone, PlusCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const STORAGE_KEY = 'dealr-beta-banner-dismissed';

export default function BetaBanner() {
  const { navigate } = useApp();
  const bannerRef = useRef(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dismissed) {
      root.style.setProperty('--beta-banner-h', '0px');
      root.classList.remove('has-beta-banner');
      return undefined;
    }

    root.classList.add('has-beta-banner');
    const el = bannerRef.current;
    if (!el) return undefined;

    const syncHeight = () => {
      root.style.setProperty('--beta-banner-h', `${el.offsetHeight}px`);
    };
    syncHeight();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(syncHeight)
      : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', syncHeight);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', syncHeight);
      root.style.setProperty('--beta-banner-h', '0px');
      root.classList.remove('has-beta-banner');
    };
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div
      ref={bannerRef}
      className="beta-banner"
      role="region"
      aria-label="Dealr beta notice"
    >
      <div className="beta-banner-inner">
        <Megaphone size={16} strokeWidth={2.25} className="beta-banner-icon" aria-hidden />
        <p className="beta-banner-text">
          <strong>Dealr is currently in beta testing.</strong>
          {' '}
          Support us by posting more ads freely — every listing helps grow the marketplace.
        </p>
        <button
          type="button"
          className="beta-banner-cta"
          onClick={() => navigate('post')}
        >
          <PlusCircle size={14} strokeWidth={2.25} aria-hidden />
          Post an ad
        </button>
        <button
          type="button"
          className="beta-banner-dismiss"
          onClick={dismiss}
          aria-label="Dismiss beta banner"
        >
          <X size={16} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
