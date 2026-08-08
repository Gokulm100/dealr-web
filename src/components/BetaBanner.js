import React, { useEffect, useRef } from 'react';
import { Megaphone, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BetaBanner() {
  const { navigate, currentPage } = useApp();
  const bannerRef = useRef(null);
  const visible = currentPage === 'home';

  useEffect(() => {
    const root = document.documentElement;
    if (!visible) {
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
  }, [visible]);

  if (!visible) return null;

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
      </div>
    </div>
  );
}
