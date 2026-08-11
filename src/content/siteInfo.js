export const SUPPORT_EMAIL = 'support@dealrapp.in';
export const TAGLINE = 'Deal with the Right App!';

/** Static download landing page (not an in-app SPA route). */
export const APP_DOWNLOAD_PATH = '/app';

/**
 * Direct APK URL hosted on dealrapp.in.
 * Override with REACT_APP_ANDROID_APK_URL when swapping hosts (e.g. Play Store later).
 */
export const ANDROID_APK_URL =
  process.env.REACT_APP_ANDROID_APK_URL || '/downloads/dealr.apk';

/** Shown until Play listing is live — then point CTAs at the Play URL instead. */
export const PLAY_STORE_STATUS = 'coming_soon';
export const PLAY_STORE_URL = process.env.REACT_APP_PLAY_STORE_URL || '';

export const ABOUT_INTRO =
  'Dealr is a local marketplace built to help people buy and sell safely, quickly, and with confidence — right in their neighbourhood.';

export const ABOUT_SECTIONS = [
  {
    title: 'What we do',
    body: 'Dealr connects buyers and sellers through listings, in-app chat, and trust signals so every deal starts on the right foot.',
  },
  {
    title: 'Built for trust',
    body: 'Reviews after completed sales, seller trust scores, fraud insights in chat, and reporting tools help keep the community safe.',
  },
  {
    title: 'Smarter listings',
    body: 'AI-powered analytics help sellers understand interest, pricing, and engagement so they can close deals faster.',
  },
];

export const ABOUT_VALUES = [
  'Local-first buying and selling',
  'Transparent profiles and reviews',
  'Privacy-aware by design (DPDP aligned)',
  'Simple tools that stay out of your way',
];

export const CONTACT_INTRO =
  'Questions, feedback, or partnership ideas? We would love to hear from you.';

export const CONTACT_TOPICS = [
  { label: 'General support', detail: 'Help with your account, listings, or messages.' },
  { label: 'Safety & reports', detail: 'Use in-app report options first — we review every report.' },
  { label: 'Privacy & data', detail: 'Questions about consent, data, or account deletion.' },
];
