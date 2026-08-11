import React, { useEffect, useRef, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { APP_DOWNLOAD_PATH } from '../content/siteInfo';

const DISMISS_KEY = 'dealr_app_banner_dismissed';

export default function AppDownloadBanner() {
  const { currentPage } = useApp();
  const bannerRef = useRef(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const visible = currentPage === 'home' && !dismissed;

  useEffect(() => {
    const root = document.documentElement;
    if (!visible) {
      root.style.setProperty('--app-banner-h', '0px');
      root.classList.remove('has-app-banner');
      return undefined;
    }

    root.classList.add('has-app-banner');
    const el = bannerRef.current;
    if (!el) return undefined;

    const syncHeight = () => {
      root.style.setProperty('--app-banner-h', `${el.offsetHeight}px`);
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
      root.style.setProperty('--app-banner-h', '0px');
      root.classList.remove('has-app-banner');
    };
  }, [visible]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="app-download-banner"
      role="region"
      aria-label="Download the Dealr Android app"
    >
      <div className="app-download-banner-inner">
        <Smartphone size={16} strokeWidth={2.25} className="app-download-banner-icon" aria-hidden />
        <p className="app-download-banner-text">
          <strong>Get the Android app</strong>
          {' '}
          — faster posting &amp; chat. Play Store coming soon.
        </p>
        <a className="app-download-banner-cta" href={APP_DOWNLOAD_PATH}>
          Download
        </a>
        <button
          type="button"
          className="app-download-banner-close"
          onClick={dismiss}
          aria-label="Dismiss app download banner"
        >
          <X size={14} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}
