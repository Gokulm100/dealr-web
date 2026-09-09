# DEALR_GROWTH_BACKLOG.md

> Living, prioritized backlog of growth opportunities for Dealr. Companion to `DEALR_GROWTH_BASELINE.md` (evidence) and `DEALR_GROWTH_PLAN.md` (experiments + operating model).
> Status legend: `proposed` → `approved` → `in_progress` → `shipped` → `measuring` → `won` / `lost` / `parked`.

## Prioritization method

`Priority score = (Expected Impact × Confidence) / Effort`, on 1–5 scales (5 = best/most). **Cost** and **Risk** are tie-breakers, not multipliers. Because production data was unavailable at discovery, **Confidence is capped at 3/5 for any item whose impact depends on unmeasured funnel/liquidity numbers**, and those items list the metric that would raise confidence. Do not treat the score as precise; it ranks, it does not predict.

`Effort` scale: 1 = trivial, 5 = large cross-repo effort. Scores below use Impact(I), Confidence(C), Effort(E).

## Backlog (ranked by priority score)

| ID | Opportunity | Evidence | Hypothesis | Expected impact (KPI) | I | C | E | Cost | Risk | Priority | Status | Experiment | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G-01 | **Mobile + funnel analytics** — extend the existing `AnalyticsEvent` model with the §11 events and emit them from `dealr-mobile`; build a server-side MAU/WAU/retention/funnel/liquidity report | Mobile emits **zero** events (`dealr-mobile/src` has no analytics SDK); admin computes no MAU/retention/funnel (`controllers/admin.controller.js`) | Instrumenting the primary client makes every later experiment measurable and reveals the true bottleneck | Enables all KPIs; unblocks decisions | 5 | 5 | 2 | ~0 (self-hosted pipeline already exists) | Low (additive, privacy-reviewed) | **12.5** | proposed | EXP-1 | — |
| G-02 | **SEO foundation** — SSR/prerender listing/category/location pages + real URLs + `sitemap.xml` + `robots.txt` + JSON-LD `Product`/`BreadcrumbList` | CSR SPA, static `index.html`, `vercel.json` rewrites all to `/`, no sitemap/robots (`DEALR_GROWTH_BASELINE.md` §7) | Indexable, value-dense pages capture long-tail local search ("used <item> <town>"), Dealr's cheapest durable channel | Organic traffic, new users, listing views | 5 | 3 | 4 | Low (Vercel functions/ISR) | Med (slow to compound; avoid thin pages) | **3.75** | proposed | EXP-2 | — |
| G-03 | **Fix mobile share URL + deep/universal links** — replace `WEB_URL` placeholder, add Android App Links + React Navigation linking | `WEB_URL='https://your-website.com'` (`dealr-mobile/src/utils/api.js`); no `intent-filter`/linking config | Working share links stop leaking the viral loop and let OG unfurls (`api/og-ad.js`) drive installs/visits | Referral/viral visits, install rate | 4 | 4 | 2 | ~0 | Low | **8.0** | proposed | — | — |
| G-04 | **Saved searches + new-match / price-drop alerts** — persist buyer search criteria; reuse push infra to alert on matches and price drops | No saved-search/price-alert in any client; push infra exists (`pushService`, `reengagement.*`) | A concrete demand-side reason to return raises D7/D30 retention and inquiries | 30-day retention, inquiries per listing, notification open rate | 4 | 3 | 3 | Low (push send volume) | Med (push fatigue — cap frequency) | **4.0** | proposed | EXP-3 | — |
| G-05 | **Liquidity dashboard + targeted seller onboarding** — compute supply/demand by category×location, surface high-demand/low-supply cells | No liquidity metrics computed; Kerala/TVM concentration (`seedTvmLocations.js`) | Directing supply acquisition at underserved cells improves match rate more than raw signups | Category/geo liquidity, listing→inquiry conversion | 5 | 2 | 3 | Low | Med (needs G-01 data first) | **3.3** | proposed | — | depends on G-01 |
| G-06 | **Signup conversion: add phone/OTP auth option** — reduce reliance on Google-only + mandatory consent wall | Google-only login gates all value; consent gate mandatory (`user.controller.js`, `ConsentScreen`) | Lower-friction auth lifts signup completion, especially mobile | Signup conversion, new active users | 4 | 2 | 4 | Med (SMS/OTP provider $) | **High — touches auth/security → approval-gated** | **2.0** | proposed | — | needs approval + G-01 baseline |
| G-07 | **Referral / invite loop** — invite links with attribution + non-abusable rewards | No referral anywhere | A structural viral loop compounds acquisition on top of existing trust | New users, viral coefficient | 4 | 2 | 3 | Med (reward economics → approval) | Med (abuse; reward spend approval-gated) | **2.7** | proposed | — | needs G-01 + reward approval |
| G-08 | **Listing quality nudges** — pre-publish completeness score prompting more photos/detail; expand AI-draft adoption | AI tools exist (`aiAnalyzer.js`) but no measured adoption/quality gate | Higher-quality listings get more inquiries, improving listing→inquiry conversion | Inquiries per listing, time-to-first-inquiry | 3 | 3 | 2 | ~0 (AI calls already used) | Low | **4.5** | proposed | — | — |
| G-09 | **Core Web Vitals / performance** — measure & improve LCP/CLS on web; assess Render cold starts | CSR SPA + single Render service (`DEALR_GROWTH_BASELINE.md` §9) | Faster pages raise SEO rank and conversion | LCP, landing conversion, organic rank | 3 | 3 | 3 | Low | Low | **3.0** | proposed | — | pairs with G-02 |
| G-10 | **Scalable search** — replace LLM-in-the-loop AI search with DB/text-index search + optional AI reranking | `aiSearchAds` embeds ad slices in the prompt (`aiAnalyzer.js`) — cost/scale risk | Faster, cheaper, better recall search improves discovery→inquiry | Search→click, inquiries, AI cost | 3 | 3 | 3 | Saves AI $ | Med | **3.0** | proposed | — | — |
| G-11 | **Surface `call seller` (high-intent contact)** — expose mapped `sellerPhone` with consent | `sellerPhone` mapped but unused in mobile UI | A second high-intent contact path lifts inquiries | Buyer inquiries, contact rate | 3 | 3 | 1 | ~0 | Med (privacy — seller opt-in) | **9.0** | proposed | — | privacy review |
| G-12 | **Notification engagement optimization** — instrument open rates, tune copy/timing of existing campaigns | Campaigns exist (`reengagement.logic.js`) but opens are unmeasured | Better-timed, measured push lifts re-engagement without more volume | Notification open rate, WAU | 3 | 3 | 2 | ~0 | Low | **4.5** | proposed | — | needs G-01 |

## Sequencing notes
- **G-01 is the gate.** G-04, G-05, G-06, G-07, G-12 all become high-confidence only after G-01 lands real funnel/retention/liquidity data.
- **G-02 and G-09** are independent of data and can proceed in parallel; both are slow-compounding, so start early.
- **G-03 and G-11** are cheap, high-ratio quick wins (small effort, clear leverage) and are good parallel tracks.
- Anything touching **auth (G-06), reward spend (G-07), or exposing phone numbers (G-11)** is **approval-gated** (see `DEALR_GROWTH_PLAN.md` §"Autonomy").

## Change log
- v1 (discovery): backlog seeded from code-only evidence; all items `proposed`; confidence capped pending production data.
