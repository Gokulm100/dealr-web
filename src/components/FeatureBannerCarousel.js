import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { APP_DOWNLOAD_PATH } from '../content/siteInfo';

const SLIDES = [
  {
    id: 'ai-post',
    image: '/banners/banner-ai-post.jpg',
    kicker: 'Dealr AI',
    title: 'Post an ad in seconds',
    subtitle: 'Snap photos — AI writes the title and description.',
    cta: 'Post an ad',
    page: 'post',
    tone: 'mint',
  },
  {
    id: 'ai-analytics',
    image: '/banners/banner-ai-analytics.jpg',
    kicker: 'For sellers',
    title: 'AI analytics that close deals',
    subtitle: 'Views, interest, and pricing insights on every listing.',
    cta: 'My ads',
    page: 'my-ads',
  },
  {
    id: 'free',
    image: '/banners/banner-free.jpg',
    kicker: 'Always free',
    title: 'List for free. Always.',
    subtitle: 'No posting fees. No hidden charges.',
    cta: 'Start listing',
    page: 'post',
  },
  {
    id: 'local',
    image: '/banners/banner-local.jpg',
    kicker: 'Neighbourhood first',
    title: 'Deal with people nearby',
    subtitle: 'Chat in-app, meet locally, buy with confidence.',
    cta: 'Open chat',
    page: 'messages',
  },
  {
    id: 'android-app',
    image: '/banners/banner-android.jpg',
    kicker: 'Android app',
    title: 'Get Dealr on your phone',
    subtitle: 'Faster posting and chat. Play Store coming soon.',
    cta: 'Download',
    href: APP_DOWNLOAD_PATH,
    tone: 'warm',
    qr: {
      src: '/banners/apk-download-qr.png',
      label: 'Scan to install',
    },
  },
];

const AUTO_MS = 4500;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function FeatureBannerCarousel() {
  const { navigate, user, showToast } = useApp();
  const trackRef = useRef(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((next, animated = true) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = ((next % SLIDES.length) + SLIDES.length) % SLIDES.length;
    indexRef.current = clamped;
    setIndex(clamped);
    const width = track.clientWidth;
    track.scrollTo({
      left: clamped * width,
      behavior: animated && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      goTo(indexRef.current + 1);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [goTo]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let lastWidth = track.clientWidth;
    const snap = () => {
      const width = track.clientWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      goTo(indexRef.current, false);
    };
    window.addEventListener('resize', snap);

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(snap)
      : null;
    if (ro) ro.observe(track);

    return () => {
      window.removeEventListener('resize', snap);
      if (ro) ro.disconnect();
    };
  }, [goTo]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    if (!width) return;
    const next = Math.round(track.scrollLeft / width);
    if (next >= 0 && next < SLIDES.length && next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  };

  const handleNavigate = (event, slide) => {
    if (slide.href) return;
    event.preventDefault();
    if ((slide.page === 'post' || slide.page === 'messages') && user?.isBlocked) {
      showToast(
        slide.page === 'post'
          ? 'You have been blocked due to repeated suspicious activity. Please wait for another 30 days to post any new ads.'
          : 'You have been blocked due to repeated suspicious activity. Please wait for another 30 days to access messages.',
        'error'
      );
      return;
    }
    navigate(slide.page);
  };

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  return (
    <section
      className="feature-banner"
      aria-roledescription="carousel"
      aria-label="Dealr features"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div
        ref={trackRef}
        className="feature-banner-track"
        onScroll={onScroll}
        onPointerDown={pause}
        onPointerUp={resume}
      >
        {SLIDES.map((slide) => {
          const isLink = Boolean(slide.href);
          const SlideTag = isLink ? 'a' : 'button';
          return (
            <SlideTag
              key={slide.id}
              className={`feature-banner-slide${slide.tone ? ` is-${slide.tone}` : ''}`}
              href={isLink ? slide.href : undefined}
              type={isLink ? undefined : 'button'}
              onClick={(event) => handleNavigate(event, slide)}
              aria-label={`${slide.title}. ${slide.subtitle}${slide.qr ? ' Scan the QR code to download the Android app.' : ''}`}
            >
              <img
                className="feature-banner-image"
                src={slide.image}
                alt=""
                draggable="false"
              />
              <span className="feature-banner-scrim" aria-hidden="true" />
              <span className="feature-banner-copy">
                <span className="feature-banner-kicker">{slide.kicker}</span>
                <span className="feature-banner-title">{slide.title}</span>
                <span className="feature-banner-subtitle">{slide.subtitle}</span>
                <span className="feature-banner-cta">
                  {slide.cta}
                  <ChevronRight size={12} strokeWidth={2.5} aria-hidden />
                </span>
              </span>
              {slide.qr ? (
                <span className="feature-banner-qr">
                  <img src={slide.qr.src} alt="" draggable="false" />
                  <span className="feature-banner-qr-label">{slide.qr.label}</span>
                </span>
              ) : null}
            </SlideTag>
          );
        })}
      </div>

      <button
        type="button"
        className="feature-banner-nav prev"
        onClick={() => goTo(index - 1)}
        aria-label="Previous feature"
      >
        <ChevronLeft size={18} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className="feature-banner-nav next"
        onClick={() => goTo(index + 1)}
        aria-label="Next feature"
      >
        <ChevronRight size={18} strokeWidth={2.25} />
      </button>

      <div className="feature-banner-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={`feature-banner-dot${i === index ? ' active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Show slide ${i + 1}: ${slide.title}`}
            aria-current={i === index ? 'true' : undefined}
          />
        ))}
      </div>
    </section>
  );
}
