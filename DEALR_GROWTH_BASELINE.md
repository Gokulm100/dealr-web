# DEALR_GROWTH_BASELINE.md

> Discovery baseline for Dealr, a Kerala-focused, OLX-style two-sided classifieds marketplace.
> Produced in a **read-only discovery pass**. No application code was changed.
> Scope of evidence: source code of the three repos in this workspace (`dealr-web`, `dealr-backend`, `dealr-mobile`). Production URL for reference: https://dealrapp.in/.

## 0. Evidence & confidence note

This baseline is derived **entirely from source code**. I did **not** have access to production data: the production database, Google Analytics, Google Search Console, real event volumes, or the hosted backend's live metrics were **not available** during discovery. Every quantitative growth claim is therefore either (a) a structural fact provable from code, or (b) an **assumption** explicitly labelled `[ASSUMPTION]`. Validating the assumptions is itself the first block of work (see §11 and `DEALR_GROWTH_PLAN.md`).

---

## 1. Architecture summary

Dealr is three separate repositories deployed independently.

### Backend — `dealr-backend` (Node/Express 5 + MongoDB)
- **Runtime:** Express 5, ES modules, `node server.js` (`server.js`). Hosted on Render (`https://e4u-backend.onrender.com`, referenced across clients).
- **Data:** MongoDB via Mongoose (`config/db.js`). Models: `user`, `ad`, `ad.category`, `chat`, `review`, `report`, `reportReason`, `consent`, `consentVersion`, `locations`, `analyticsEvent`, `analyticsVisitor` (`models/`).
- **Realtime:** Socket.IO with JWT-authenticated handshake and per-user rooms (`socket.js`).
- **Auth:** Google OAuth only. Client sends a Google ID token to `POST /api/users/login`; backend verifies via `google-auth-library` and issues a 7‑day app JWT (`controllers/user.controller.js`). There is **no** email/password or phone/OTP path.
- **Integrations:** Cloudinary (image storage, `middleware/fileUpload.js`), Firebase Admin (FCM push + credential bootstrap, `firebase-admin.js`, `services/pushService.js`), Google Auth Library, `web-push` (dependency present), an LLM client (Gemini-branded, `aiAnalyzer/llmClient.js`).
- **Jobs:** Re-engagement cron endpoint `POST /api/jobs/reengage` guarded by `CRON_SECRET` (`controllers/job.controller.js`), plus scripts `seedTvmLocations`, `removeDemoListings`, `runReengagement` (`package.json`).
- **API surface:** `/api/users`, `/api/ads`, `/api/ai`, `/api/admin`, `/api/analytics`, `/api/reviews`, `/api/jobs` (`server.js`).

### Web — `dealr-web` (React 18 CRA, SPA)
- **Framework:** Create React App (`react-scripts`), single-page app. Global state via React Context (`src/context/AppContext.js`).
- **Routing:** **State-based, not URL-based.** The visible "page" is a `currentPage` string switched in `src/App.js` (`PageRouter`); the URL almost never changes. The only URL parameter used is `?ad=<id>` (`syncAdQuery` in `AppContext.js`).
- **Hosting:** Vercel (`vercel.json`). All non-`/api` paths rewrite to `/` (the SPA shell). Two serverless functions exist: `api/og-ad.js` (Open Graph unfurl shim for shared listings, mapped from `/ad/:id`) and `api/facebook/share-ad.js`.
- **API base:** `process.env.REACT_APP_API_BASE_URL` with a fallback to the Render backend (`AppContext.js`).
- **Analytics:** homegrown, `src/utils/siteAnalytics.js` → `POST /api/analytics/track`.

### Mobile — `dealr-mobile` (Expo React Native, Android-first)
- **Framework:** Expo SDK 54, React Native 0.81, native Firebase (`@react-native-firebase/*`), Notifee. Package `com.dealr.app`.
- **Distribution:** EAS build; `preview`=APK, `production`=AAB to Play **internal / draft** track (`eas.json`); a signed APK is also shipped directly (`distribution/dealr-1.0.1.apk`) and hosted for web download.
- **Auth/API:** Google Sign-In → same `POST /api/users/login`; central `apiFetch` against the Render backend (`src/utils/api.js`).
- **Note:** `src/utils/api.js` hard-codes `API_BASE_URL` and has `WEB_URL = 'https://your-website.com'` — a **placeholder that breaks share links** (see §9).

**Deployment model:** backend on Render, web on Vercel, mobile via EAS/Play + direct APK. There is no evidence of CI/CD config, staging environment, or automated deploy pipeline in the repos (no `.github/workflows`, no staging config observed).

---

## 2. User journey (all clients)

1. **Land** → Home feed of listings (guest browsing allowed on web and mobile).
2. **Discover** → category pills, subcategory pills, text search, location filter, price filter, sort (web); recently-viewed rail; similar-ads rail on detail.
3. **Auth gate** → Google Sign-In required to favorite, chat, post, or review. First login forces a **consent gate** (DPDP-style privacy acceptance) before the app is usable (`ConsentScreen` / `ConsentPage`).
4. **Act** → as buyer (chat, offer, favorite) or seller (post ad, manage ads, mark sold).
5. **Retain** → push notifications (new-in-interest, seller-unread, saved-still-up), recently viewed, favorites, review prompts.

## 3. Seller journey
- Post ad flow: photos (max 5) → optional **"Draft with AI" from photos** (`extractAdFromImages`) → title/category/subcategory → price → location (with new-location wizard) → **AI-assisted description** (min ~150 chars, `generateDescriptionUsingAI`) → submit `POST /api/ads/postAdd`.
- On publish, `notifyUsersOfNewAd` pushes the listing to users whose viewing history matches its category/subcategory (`services/categoryMatchNotify.service.js`) — a real supply→demand loop.
- Manage: enable/disable, edit, **mark sold** (choose buyer from interested users, enter sale amount) → triggers a **post-sale review prompt**.
- Seller insights (owner-only): AI price insights and AI analytics on the detail page.
- Reputation: trust score (default 50), rating average, review count, completed sales, badges (`models/user.model.js`, `services/trustScore.service.js`).

## 4. Buyer journey
- Browse/search → open listing → view AI summary, genuineness meter, seller trust line → **chat with seller** (text, image, make offer) → seller accepts offer → mark sold → buyer prompted to review the seller.
- Favorites and recently-viewed support return visits; fraud/safety banner in chat (`analyzeChatForFraud`).

---

## 5. Current growth mechanisms (what already exists)

Dealr is **not** a greenfield growth project — meaningful machinery is already built:

| Mechanism | Where | Flywheel stage |
|---|---|---|
| Interest-based new-ad push (matches viewer history to new listings) | `services/categoryMatchNotify.service.js`, `viewHistory.logic.js` | Discovery, re-engagement |
| Re-engagement cron: `seller_unread`, `new_in_interest`, `saved_still_up` campaigns; quiet hours + 7‑day cooldown | `services/reengagement.service.js` + `.logic.js`, `POST /api/jobs/reengage` | Retention |
| Trust score, ratings/reviews, badges, genuineness meter, post-sale review funnel | `services/trustScore.service.js`, `models/review.model.js`, `ReviewModal`, `PostSaleReminderModal` | Trust → transaction, retention |
| AI listing tools: photo→draft, description writer, listing summary | `aiAnalyzer/aiAnalyzer.js` | Reduce seller friction, listing quality |
| AI seller insights: price insights, seller analytics, fraud detection | `aiAnalyzer/aiAnalyzer.js`, `controllers/ai.controller.js` | Seller retention, trust |
| Favorites + recently-viewed + top-interest tracking | `user.model.js`, mobile/web local caches | Retention |
| Native share of listings (web + mobile) | `AdDetailPage`, mobile `handleShare` | Viral (leaky — see §9) |
| Open Graph unfurl for shared listing links | `api/og-ad.js` | Viral, social CTR |
| Homegrown web analytics + admin dashboards (ad viewers, visitors, activity log) | `siteAnalytics.js`, `services/analytics.service.js`, `controllers/admin.controller.js` | Measurement (web only) |
| App download funnel (web `/app` page, APK hosting, download-CTA events) | `public/app.html`, `AppDownloadBanner`, `trackDownloadPageCta` | Acquisition (web→app) |

---

## 6. Current analytics

**Homegrown event pipeline (web only):** `siteAnalytics.js` batches events to `POST /api/analytics/track`, stored as `AnalyticsEvent` and rolled into `AnalyticsVisitor` (first/last seen, page/ad view counts) (`services/analytics.service.js`).

**Event catalogue (the only 10 event types that exist):** `visit`, `page_view`, `ad_view`, `login`, `logout`, `post_ad`, `edit_ad`, `search`, `chat`, `report` (`services/analytics.logic.js`, `EVENT_TYPES`). `ad_view` also increments listing view counts (owner views excluded).

**Admin reporting:** ad-viewers dashboard (per-ad unique viewers), visitors dashboard (total / signed-in / anonymous), and a raw activity log (`controllers/admin.controller.js` → `services/analytics.service.js`). There is **no** computation of MAU/WAU/DAU, cohort retention, funnel conversion, time-to-first-listing/inquiry, listing→inquiry rate, or liquidity by category/geo.

**Critical gaps:**
- **Mobile emits zero analytics events.** No Segment/Amplitude/Mixpanel/Firebase Analytics/PostHog/Sentry in `dealr-mobile/src`. Since the mobile app is the primary consumer client, **most real marketplace behavior (posting, chatting, searching, offering on mobile) is invisible.**
- **No GA4 / Google Search Console / GTM** anywhere (`public/index.html` has no tags; no verification file).
- The 10 events omit high-signal marketplace actions: `contact_seller`/inquiry as a first-class event (chat is coarse), `favorite_added`, `offer_made`/`offer_accepted`, `mark_sold`, `listing_creation_started` (only completed `post_ad` exists), `signup`/`user_registered` vs `login`.

## 7. Current SEO

**This is the single largest structural weakness for organic acquisition.**

- The web app is a **client-side-rendered SPA** with a **static** `public/index.html`: fixed `<title>`, **no meta description, no Open Graph/Twitter tags, no canonical, no JSON-LD structured data** on the app shell.
- **No indexable content URLs.** Routing is state-based; `vercel.json` rewrites `/((?!api/).*)` → `/`. There are no `/category`, `/category/location`, or crawlable `/ad/:id` HTML pages. Listing/category/location content only exists after client-side JS runs, which most crawl paths won't index well.
- **No `robots.txt` and no `sitemap.xml`** in `public/` (confirmed absent).
- **No search-engine verification** and no evidence of Search Console usage.
- The one SEO-positive artifact: `api/og-ad.js` renders per-listing OG/Twitter meta for the `/ad/:id` path — but it's a **redirect shim** to `/?ad=<id>`, good for social unfurls, **not** an indexable content page.

Net: a Kerala marketplace's most durable, lowest-cost acquisition channel — long-tail organic search like "used Activa Thiruvananthapuram" — is effectively **unavailable** today.

## 8. Current conversion funnel (as instrumented)

Only the web funnel is partially observable; the mobile funnel is dark.

```
visit → page_view → ad_view → (login) → chat / post_ad
```
- No explicit signup event (login conflates first-time vs returning).
- No `listing_creation_started`, so post-ad drop-off is unmeasurable.
- `chat` is the closest thing to a buyer-inquiry event, but there is no `contact_seller` intent event, no offer events, no `mark_sold` event.
- Retention is actioned (re-engagement push) but **not measured** (no cohort/retention reporting).

---

## 9. Technical bottlenecks

1. **SEO-hostile architecture** — CSR SPA, no URLs, no sitemap/robots, no SSR/prerender (§7). Blocks organic acquisition at the foundation.
2. **Mobile analytics blackout** — the primary client emits no telemetry (§6). Blocks data-driven decisions where activity actually happens.
3. **Broken viral loop on mobile** — `WEB_URL = 'https://your-website.com'` placeholder in `dealr-mobile/src/utils/api.js` means shared listing URLs are non-functional; deep links / universal links are not configured (no `intent-filter`, no React Navigation linking). Every share leaks.
4. **Backend on a single Render service** using local `uploads/` in-repo (23 files committed under `dealr-backend/uploads/`) alongside Cloudinary — mixed storage; cold starts on Render free/basic tiers `[ASSUMPTION]` can slow first paint and hurt Core Web Vitals and re-engagement click-through.
5. **No staging / CI** observed — raises risk for the "test against staging" workflow the growth mandate requires.
6. **AI search** loads candidate ads into the LLM prompt (`aiSearchAds` embeds the ads DB slice as JSON) — will not scale and is costly per query as inventory grows.

## 10. Product bottlenecks

1. **Auth friction / single provider** — Google-only sign-in gates all valuable actions plus a mandatory consent wall. No phone/OTP (the dominant Indian classifieds pattern) `[ASSUMPTION: raises signup drop-off]`.
2. **Weak demand-side retention hooks** — no **saved searches** and no **price-drop alerts** (confirmed absent in all clients); re-engagement is supply/interest-driven only.
3. **No referral/invite loop** — no codes, links, or rewards anywhere. No structural viral acquisition.
4. **Geographic concentration** — content and location seeding are Kerala/Thiruvananthapuram-centric (`scripts/seedTvmLocations.js`, AI prompts hard-bias Kerala). Liquidity depth outside TVM is unproven `[ASSUMPTION]`.
5. **Listing quality variance / "seeded" demo listings** — seeded-listing plumbing exists (`seededListing.js`, `SeededBadge`, `removeDemoListings`), implying supply has been bootstrapped; genuine-supply liquidity is the real question.
6. **`call seller` unused** — `sellerPhone` is mapped in the mobile listing model but never surfaced; a high-intent contact path is left on the table.

## 11. Missing instrumentation (must-add to make growth measurable)

Recommended event model, aligned to the **existing** `AnalyticsEvent` schema (add types to `EVENT_TYPES`) and extended to **mobile**:

**Acquisition/onboarding:** `user_registered` (first login distinct from `login`), `consent_accepted`, `profile_completed`.
**Supply funnel:** `listing_creation_started`, `listing_ai_draft_used`, `listing_created` (exists as `post_ad`), `listing_published_with_ai_description`.
**Demand funnel:** `search_performed` (exists as `search`; add on mobile), `search_result_clicked`, `contact_seller` (distinct buyer-inquiry intent), `offer_made`, `offer_accepted`, `favorite_added`, `share_listing`.
**Transaction/retention:** `mark_sold`, `review_submitted`, `notification_received`, `notification_opened`, `user_returned` (session after ≥1 day).

**Derived metrics to compute server-side (currently none):** MAU/WAU/DAU, new vs returning, D1/D7/D30 retention cohorts, time-to-first-listing, time-to-first-inquiry, listings per active seller, inquiries per listing, listing→inquiry conversion, category liquidity, geographic liquidity, notification open rate.

**Highest-priority instrumentation gap:** add the analytics client to **mobile** first — without it, no funnel or retention number can be trusted.

## 12. Risks

- **Data-blind decisions:** acting before mobile instrumentation + funnel reporting exist risks optimizing the wrong stage. Mitigation: instrument first (§11).
- **SEO changes are slow to compound and easy to over-do:** avoid mass low-value programmatic pages; build value-dense category/location/listing pages only (per mandate §11 of the role brief).
- **Push fatigue:** re-engagement + interest push already exist; adding saved-search/price-drop alerts without frequency caps risks unsubscribes. Reuse the existing quiet-hours/cooldown discipline (`reengagement.logic.js`).
- **Trust/anti-abuse:** any acquisition push must not incentivize fake listings/users (explicitly forbidden). Referral rewards must be abuse-resistant.
- **Single-provider auth + consent wall** changes touch security/legal — **approval-gated** (see plan).
- **Render cold starts / single instance** could cap experiment throughput and skew latency-sensitive metrics `[ASSUMPTION—verify]`.

## 13. Recommended priorities (summary; detail in `DEALR_GROWTH_PLAN.md`)

1. **Make growth measurable** — add mobile analytics + a funnel/retention/liquidity reporting layer over the existing `AnalyticsEvent` data. (Prerequisite for everything.)
2. **Unlock organic acquisition** — SSR/prerender + indexable listing/category/location URLs + `sitemap.xml`/`robots.txt` + JSON-LD. Highest-leverage sustainable channel.
3. **Fix the viral leak** — real share URLs + deep/universal links on mobile; then layer a referral loop.
4. **Deepen demand-side retention** — saved searches + price-drop/new-match alerts, reusing existing push infrastructure.
5. **Target liquidity** — once liquidity metrics exist, direct seller onboarding/incentives at high-demand/low-supply category×location cells.

See `DEALR_GROWTH_BACKLOG.md` for the prioritized backlog and `DEALR_GROWTH_PLAN.md` for the top-10 opportunities, the 3 first experiments (full experiment framework), required data/credentials, and the proposed autonomous operating model.
