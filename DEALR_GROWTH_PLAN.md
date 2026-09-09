# DEALR_GROWTH_PLAN.md

> The action plan built on `DEALR_GROWTH_BASELINE.md` (evidence) and `DEALR_GROWTH_BACKLOG.md` (prioritized backlog).
> Covers: top‑10 opportunities, the 3 first experiments (full framework), the data/analytics needed to validate them, missing instrumentation, required credentials/integrations, the proposed autonomous operating model, and the autonomous-vs-approval boundary.
> No application code has been changed. This is a plan awaiting your go-ahead.

---

## A. Why Dealr is / isn't growing — the core thesis

From code-only evidence (production metrics were unavailable — see baseline §0), Dealr already has strong **transaction, trust, and retention machinery** (interest-based push, re-engagement cron, reviews/trust, AI listing tools). What it structurally **lacks** is:

1. **Measurement** — the primary client (mobile) emits **no analytics**, and no funnel/retention/liquidity metrics are computed. **We are flying blind.**
2. **Sustainable acquisition** — the web app is **SEO-invisible** (CSR SPA, no URLs, no sitemap/robots), so the cheapest durable channel for a local marketplace is closed.
3. **A viral loop** — mobile share links are **broken** (`WEB_URL` placeholder) and there is no referral program.

> **Best current hypothesis for the #1 bottleneck:** *sustainable acquisition* (SEO + viral) is throttled while the product/transaction layer is comparatively mature. But this is provisional — **it cannot be confirmed until measurement (Experiment 1) exists.** The plan therefore front-loads instrumentation, then attacks acquisition, then retention/liquidity.

---

## B. Top 10 growth opportunities (prioritized)

Ordered by backlog priority score and sequencing. IDs map to `DEALR_GROWTH_BACKLOG.md`.

1. **G-01 — Mobile + funnel analytics (the enabler).** Extend `AnalyticsEvent` with real marketplace events and emit them from mobile; compute MAU/WAU/retention/funnel/liquidity. *Unblocks every other item.*
2. **G-11 — Surface `call seller` (quick win).** Expose the already-mapped `sellerPhone` (seller opt-in) — a second high-intent inquiry path for near-zero effort.
3. **G-03 — Fix mobile share + deep links (quick win).** Replace the `WEB_URL` placeholder and wire Android App Links so shares and OG unfurls actually convert.
4. **G-02 — SEO foundation.** SSR/prerender + indexable listing/category/location URLs + `sitemap.xml`/`robots.txt` + JSON-LD. Highest-leverage sustainable acquisition.
5. **G-08 — Listing-quality nudges.** Pre-publish completeness score + wider AI-draft adoption to lift inquiries-per-listing.
6. **G-04 — Saved searches + new-match/price-drop alerts.** A concrete demand-side reason to return; reuses push infra.
7. **G-12 — Notification engagement optimization.** Instrument open rates; tune existing campaign copy/timing (no added volume).
8. **G-09 — Core Web Vitals / performance.** Improve LCP/CLS and assess Render cold starts; compounds with SEO and conversion.
9. **G-05 — Liquidity dashboard + targeted seller onboarding.** Compute supply/demand by category×location and direct acquisition at underserved cells.
10. **G-10 — Scalable search.** Replace LLM-in-the-loop AI search with a DB/text index (+ optional AI rerank) for cost, speed, recall.

*(Approval-gated, staged for later: G-06 phone/OTP auth, G-07 referral rewards — both need explicit approval; see §F.)*

---

## C. The 3 highest-impact experiments to run first

Each uses the mandated experiment framework. **EXP-1 is a hard prerequisite** for trustworthy readouts of EXP-2/EXP-3.

### EXP‑1 — Instrument the funnel (mobile analytics + reporting)

- **Hypothesis:** If we emit the missing marketplace events from mobile and compute funnel/retention/liquidity, we can identify the true #1 bottleneck and measure every subsequent experiment.
- **Problem / evidence:** `dealr-mobile/src` contains no analytics SDK or event calls; `EVENT_TYPES` has only 10 web-centric types; `admin.controller.js` computes no MAU/retention/funnel. The primary client is dark (baseline §6, §11).
- **Intervention:**
  - Add a lightweight analytics client to `dealr-mobile` posting to the **existing** `POST /api/analytics/track` (same batching/queue design as `siteAnalytics.js`).
  - Extend `EVENT_TYPES` (`services/analytics.logic.js`) with: `user_registered`, `listing_creation_started`, `contact_seller`, `offer_made`, `offer_accepted`, `favorite_added`, `share_listing`, `mark_sold`, `review_submitted`, `notification_opened`, `search_result_clicked`, `user_returned`.
  - Add a read-only reporting endpoint/aggregation: MAU/WAU/DAU, new vs returning, D1/D7/D30 cohorts, time-to-first-listing, time-to-first-inquiry, listings-per-active-seller, inquiries-per-listing, listing→inquiry conversion, category & geo liquidity.
- **Expected impact (KPI):** No direct KPI lift; it **unlocks measurement of all KPIs**. Success = a working weekly funnel/retention/liquidity readout.
- **Measurement:** event volume by type from mobile > 0; dashboards render non-null cohorts; numbers reconcile against `AnalyticsVisitor`.
- **Cost:** ~0 (reuses self-hosted pipeline; no new vendor). Minor DB write increase.
- **Risk:** Low. Privacy: events must respect the existing consent gate; no new PII beyond current fields. Additive schema change.
- **Rollback:** Feature-flag the mobile analytics client; new event types are additive (revert = stop emitting; drop the reporting endpoint).
- **Experiment duration:** ~1–2 weeks of data capture after ship to get first cohorts.
- **Success criteria:** ≥90% of active mobile sessions produce a `visit`; the four funnel stages (browse→auth→inquiry/post) populate; D1/D7 retention computable for ≥1 weekly cohort.

### EXP‑2 — SEO foundation: indexable listing/category/location pages

- **Hypothesis:** Server-rendered, value-dense listing/category/location pages with proper metadata + sitemap will win long-tail local search and become a compounding, near-zero-marginal-cost acquisition channel.
- **Problem / evidence:** CSR SPA, static `index.html`, `vercel.json` rewrites all to `/`, no `robots.txt`/`sitemap.xml`, no JSON-LD (baseline §7). Organic search is effectively unavailable.
- **Intervention (phased, value-dense only — no thin/programmatic spam):**
  1. Add `robots.txt` + a dynamic `sitemap.xml` (active listings, populated categories, populated locations).
  2. SSR/prerender (Vercel functions/ISR) real URLs: `/ad/:slug-:id`, `/:category`, `/:category/:location` — each with unique `<title>`/description, canonical, OG/Twitter, and JSON-LD (`Product`, `BreadcrumbList`, `ItemList`).
  3. Internal linking (category ↔ location ↔ listing; related listings) and hand back to the SPA for interactivity.
  4. Guardrail: only generate a category/location page when it has ≥ N live listings (avoid thin content).
- **Expected impact (KPI):** organic impressions/clicks (Search Console), new users from organic, listing views from organic landing.
- **Measurement:** Google Search Console (impressions, clicks, indexed pages, CTR, avg position) + `AnalyticsEvent` `page_view` with referrer=organic; compare pre/post.
- **Cost:** Low (Vercel serverless/ISR); engineering effort is the main cost. **Requires Search Console access (see §E).**
- **Risk:** Medium — SEO compounds slowly (6–12 weeks to read); risk of thin-content penalties if guardrails ignored (mandate forbids low-value mass pages).
- **Rollback:** Pages are additive; revert the rewrites/sitemap. Existing SPA behavior unchanged for logged-in flows.
- **Experiment duration:** 8–12 weeks minimum for a fair organic readout (with a 2-week indexing warm-up).
- **Success criteria:** indexed pages grow from ~0 to the count of qualifying listings/categories/locations; organic clicks trend materially upward over 8–12 weeks vs the flat baseline; no manual-action/thin-content flags in Search Console.

### EXP‑3 — Saved searches + new-match / price-drop alerts

- **Hypothesis:** Giving buyers a concrete, personalized reason to return (a saved search that pings on new matches / price drops) raises D7/D30 retention and inquiries, without adding push fatigue.
- **Problem / evidence:** No saved-search or price-alert in any client; retention is currently supply/interest-driven only; push infra already exists (`pushService`, `reengagement.*`) (baseline §5, §10).
- **Intervention:**
  - Persist a buyer's search criteria (query + filters) as a "Saved search".
  - On new listing publish (hook alongside `notifyUsersOfNewAd`) and on price edits, match against saved searches and send an alert **reusing the existing quiet-hours + cooldown discipline** from `reengagement.logic.js`.
  - Instrument `saved_search_created`, `notification_opened`, and returns attributed to alerts.
- **Expected impact (KPI):** 30-day retention, WAU, inquiries per listing, notification open rate.
- **Measurement:** A/B — users offered saved-search alerts vs holdout; compare D7/D30 return rate, inquiries, and open rate (requires EXP‑1 metrics).
- **Cost:** Low (incremental push volume; matching runs on publish/edit).
- **Risk:** Medium — notification fatigue/unsubscribes; mitigate with per-user frequency caps and the existing cooldown.
- **Rollback:** Feature-flagged; disable alerting and hide the saved-search UI (data retained or purged).
- **Experiment duration:** 4 weeks (to observe a D30 window on the first cohort).
- **Success criteria:** treatment D30 retention and inquiries-per-user beat holdout by a pre-registered margin with acceptable unsubscribe/opt-out rates; notification open rate ≥ existing re-engagement campaigns.

---

## D. Analytics / data needed to validate the experiments

- **EXP‑1:** the mobile event stream itself + the new derived-metrics reporting layer (this experiment *creates* the data).
- **EXP‑2:** **Google Search Console** (impressions, clicks, indexed-page count, CTR, position) — the authoritative organic signal; plus internal `page_view` with referrer classification. Optionally GA4 for channel attribution.
- **EXP‑3:** EXP‑1's retention cohorts + notification open/return attribution; A/B assignment stored per user.
- **Cross-cutting (currently missing, needed for prioritization):** MAU/WAU/DAU, new vs returning, D1/D7/D30 cohorts, time-to-first-listing, time-to-first-inquiry, listings-per-active-seller, inquiries-per-listing, listing→inquiry conversion, category liquidity, geographic liquidity, notification open rate. **None are computed today.**

## E. Missing instrumentation (consolidated)

Add to `EVENT_TYPES` (`services/analytics.logic.js`) and emit from **both** web and mobile: `user_registered`, `consent_accepted`, `profile_completed`, `listing_creation_started`, `listing_ai_draft_used`, `contact_seller`, `offer_made`, `offer_accepted`, `favorite_added`, `share_listing`, `search_result_clicked`, `mark_sold`, `review_submitted`, `notification_received`, `notification_opened`, `user_returned`. Then build the derived-metrics reporting layer (§D). **Mobile-first** — it's the largest blind spot.

## F. Credentials / integrations / access required (from you)

None are needed to *begin* EXP‑1 code (it reuses the existing self-hosted pipeline). The following are needed to **validate/operate** experiments and are added via the Secrets panel — never committed:

| Need | For | Type | Blocking? |
|---|---|---|---|
| **Google Search Console** access (verify `dealrapp.in`; API service account or shared property) | EXP‑2 organic measurement | Access + optional service-account key | Blocks EXP‑2 readout (not EXP‑2 code) |
| **GA4** property + measurement ID (optional) | Channel attribution to complement internal analytics | Config value | Optional |
| **Staging environment + backend/DB access** (or a safe staging DB URL) | Mandated "test against staging" workflow; validating aggregations against real data shape | Env/secret | Needed before any prod-affecting change |
| **Read access to production analytics/DB metrics** (read-only) | Confirm/replace the `[ASSUMPTION]`s in the baseline; rank the true bottleneck | Read-only credential | Needed to raise confidence on G-04/05/06/07/12 |
| **SMS/OTP provider** (e.g., MSG91/Twilio) | G-06 phone auth (approval-gated) | Paid integration | Only if G-06 approved |
| **Push analytics** (delivery/open callbacks) | Notification open-rate accuracy (FCM already present) | Config | Optional |

> Per security rules, I will never print or commit secret values; please add any approved items in the Secrets panel and I'll consume them as env vars.

## G. Proposed autonomous operating model

**Cadence:** run the mandated loop — OBSERVE → ANALYZE → IDENTIFY BOTTLENECK → HYPOTHESIZE → DESIGN → ESTIMATE → CHECK PERMISSIONS → IMPLEMENT → TEST → PR → MEASURE → LEARN → UPDATE PRIORITIES.

**Working rules:**
- One experiment per feature branch (`cursor/...`), one PR per logical change, tests + lint + build green before PR (backend has a real suite: `npm test`).
- Every PR links its backlog ID and includes the experiment's success criteria + rollback (feature-flag by default).
- Update `DEALR_GROWTH_BACKLOG.md` status and `DEALR_WEEKLY_GROWTH_REPORT.md` each cycle (KPI deltas, winners/losers, insights, next experiments, blockers, approval requests).
- Never ship prod-affecting changes without staging validation and, where the boundary in §H requires it, your approval.
- Measurement-first: do not launch an initiative whose KPI can't yet be measured (i.e., EXP‑1 gates most of the backlog).

**First two cycles I recommend:**
- **Cycle 1:** EXP‑1 (instrumentation) + the two quick wins G-11 (`call seller`, with seller opt-in/privacy review) and G-03 (fix share/deep links). Begin EXP‑2 scaffolding (`robots.txt` + `sitemap.xml`).
- **Cycle 2:** EXP‑2 SSR pages behind the liquidity guardrail; start EXP‑3 saved searches; publish the first weekly report once EXP‑1 data lands.

## H. Autonomy boundary — what I'll do vs what needs your approval

**I will do autonomously (low-risk, reversible, no spend):**
- Repo/code/analytics analysis and reports (this discovery).
- Add analytics instrumentation and the reporting layer (EXP‑1), behind flags.
- SEO foundation work: `robots.txt`, `sitemap.xml`, SSR/prerender pages, metadata, JSON-LD, internal linking (EXP‑2), value-dense only.
- Fix bugs (e.g., `WEB_URL` placeholder, deep links), performance/CWV work, query optimization, scalable search (G-10), listing-quality nudges (G-08), notification copy/timing tuning (G-12).
- Add tests/tooling; create branches and PRs; propose experiments with measurable criteria.

**I will STOP and ask approval before (per the role brief §8):**
- Any **spend** or paid integration (SMS/OTP for G-06, ad budgets, paid third-party services).
- **Bulk/external communications** or contacting users for marketing; publishing content externally under your identity; creating external-platform accounts.
- **Deploying major production changes**, **destructive/irreversible migrations**, or modifying/deleting production data.
- **Auth/security changes** (G-06 phone/OTP), **pricing/fees** changes, **legal/privacy** functionality changes.
- **Referral reward economics** (G-07) and **exposing seller phone numbers** (G-11) — pending a privacy/opt-in decision.

**Explicitly out of bounds (never, per security rules):** fake users/listings, inflated engagement, review manipulation, scraping in violation of terms, impersonation, bypassing auth. Growth must come from legitimate product, SEO, referral, retention, and liquidity improvements.

---

## Next step (awaiting your go-ahead)

Recommended: approve **EXP‑1 (instrumentation)** so measurement exists, plus the two quick wins (G-03, G-11 with a privacy decision). I will implement each on its own branch with tests and a PR, keep the backlog and weekly report updated, and only cross the approval boundary in §H with your explicit sign-off.
