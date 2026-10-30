# Tarawing — Development Progress

Reference architecture: `tianyan` (Express + PostgreSQL + Angular). Tarawing
reimplements its patterns (JWT auth, admin RBAC, orders/payment state
machine, JSONB reports) for astrology/tarot, in English, with Next.js
instead of Angular. Full plan below, batch by batch. Each batch is marked
done/in-progress/todo as it's completed — update this file after every batch.

See `../AGENTS.md` for the actual coding rules/constraints this project
follows, and `../README.md` for setup and architecture from a human's
perspective. This file is the historical log of how it got here.

---

## Batch 1 — Backend core (DONE)
- [x] `server/db/index.js` — schema (users, admins, readings, orders,
      notifications, consultations, articles, faq, settings, audit_logs)
- [x] `server/db/seed-data.js` — FAQ + article seed content
- [x] `server/middlewares/auth.js` — user JWT + admin JWT/RBAC + rate limit
- [x] `server/middlewares/validate.js`, `server/schemas/index.js` — Zod validation
- [x] `server/data/tarotDeck.js` — 78-card deck (22 Major hand-written + 56 Minor from suit/rank tables)
- [x] `server/data/lenormandDeck.js` — 36-card deck
- [x] `server/data/playingCardsDeck.js` — 52-card cartomancy deck
- [x] `server/data/spreads.js` — Holy Triangle / Gypsy Cross / Hexagram / Solomon's Star / Seven Planets
- [x] `server/services/cardService.js` — crypto-secure shuffle & spread draw
- [x] `server/services/astrologyService.js` — Sun/Moon/Ascendant via Meeus low-precision formulas
- [x] `server/services/aiReading.js` — Anthropic API call, graceful degrade without key
- [x] `server/services/paymentService.js` — sandbox payment simulation
- [x] `server/server.js` — full route set (auth, readings, orders, notifications, consultations, admin, content)
- [x] `server/utils/logger.js`, `.env.example`, `package.json`
- [x] Verified: `node --check` on all server files, deck sizes (78/36/52),
      Sun-sign solstice/Capricorn sanity checks, live spread draw output
- [ ] **Not yet verified**: no network in this environment to `npm install`
      or run against a real Postgres — needs a first real run on your end
      (steps in README)

## Batch 2 — Frontend core (DONE)
- [x] Design system (`app/globals.css`) — deep-indigo/brass palette, Fraunces+Inter
- [x] `lib/api.ts`, `lib/types.ts` — API client + shared types
- [x] `components/Nav.tsx`, `Footer.tsx`, `CardDisplay.tsx`, `AiReadingPanel.tsx`
- [x] `app/page.tsx` — homepage (orbit hero + three-engine grid)
- [x] `app/tarot/page.tsx` — single-card draw (Tarot/Lenormand/Playing Cards)
- [x] `app/spreads/[type]/page.tsx` — Sacred Layout Engine spreads
- [x] `app/astrology/page.tsx` — natal chart form + result
- [x] `app/login/page.tsx`, `app/register/page.tsx`
- [x] `app/dashboard/page.tsx` — reading history + sandbox unlock purchase

## Batch 3 — Frontend public content pages (DONE)
- [x] `app/library/page.tsx` — article list
- [x] `app/library/[slug]/page.tsx` — article detail
- [x] `app/faq/page.tsx` — FAQ accordion

## Batch 4 — Admin portal (DONE)
- [x] `lib/adminAuth.tsx` — admin identity context (fetches `/api/admin/me`, redirects to login if unauthenticated)
- [x] `app/admin/login/page.tsx` — outside the guarded route group on purpose
- [x] `app/admin/(dashboard)/layout.tsx` + `AdminShell.tsx` — guarded shell + permission-filtered side nav
      (route group used specifically so `/admin/login` is NOT wrapped by the auth guard — avoids a redirect loop)
- [x] `app/admin/(dashboard)/page.tsx` — overview stats (users/readings/paid orders/revenue/readings-by-type)
- [x] `app/admin/(dashboard)/users/page.tsx` — search, role change, delete
- [x] `app/admin/(dashboard)/orders/page.tsx` — filter by status, soft-delete
- [x] `app/admin/(dashboard)/readings/page.tsx` — detail view, admin notes, AI reading generation
- [x] `app/admin/(dashboard)/consultations/page.tsx` — inbox + reply
- [x] `app/admin/(dashboard)/content/page.tsx` — articles + FAQ CRUD (tabs)
- [x] `app/admin/(dashboard)/settings/page.tsx` — site settings incl. donation prompt
- [x] `app/admin/(dashboard)/admins/page.tsx` — super-admin-only account management with permission checkboxes

## Batch 5 — Build verification (DONE, within sandbox limits)
- [x] `npm install` attempted for both server and client — blocked by this sandbox's
      network policy (403 from registry.npmjs.org), not a project issue. You'll need
      to run this yourself.
- [x] Ran `tsc --noEmit` against the whole client tree using a global TypeScript
      install (fixed a deprecated `baseUrl` tsconfig option along the way).
      Every single reported error was "Cannot find module 'react'/'next'" or
      "Cannot find namespace JSX" — i.e. exactly what you'd expect with zero
      packages installed. **No real type errors, no syntax errors, no unclosed
      JSX, no prop mismatches were found once that noise is filtered out.**
      Confirmed by testing tsc against a deliberately-broken scratch file first,
      to make sure it wasn't silently skipping checks.
- [x] Server: all files pass `node --check`; deck sizes, spread draws, and
      astrology solstice/date sanity checks verified live (see Batch 1).
- [ ] **Genuinely not run**: `next build`, `next dev`, or the server against a
      real Postgres. First real end-to-end run is on you — see README "First run".

## Batch 6 — Packaging & handoff (DONE)
- [x] Root `package.json` (concurrently dev script)
- [x] Root `README.md` (setup, env vars, architecture notes, what's real vs. stubbed)
- [x] Root `.gitignore`
- [x] Zipped the full monorepo, presented to user

---

## Batch 7 — Terms/Privacy, visual polish, original card art (DONE)
- [x] `app/terms/page.tsx`, `app/privacy/page.tsx` — added
- [x] `Footer.tsx` — removed the `/admin/login` link (shouldn't be advertised
      to end users), added Terms + Privacy
- [x] Look-and-feel pass: sticky/blurred nav, a subtle fixed starfield
      background (pure CSS radial-gradients, no image assets), a slow
      opposing-direction rotation on the two outer orbit rings on the
      homepage, a trust-bar row under the hero, card hover-lift + staggered
      entrance animation. **Honest caveat**: astrorg.com is a JS-rendered SPA
      and `web_fetch` only returned its meta tags, not the rendered
      page — there was no way to see or copy its actual visual design in
      this environment, so this batch is general polish, not a recreation
      of that specific site.
- [x] `components/CardArt.tsx` — original SVG "sigil" icon per Major Arcana
      card (infinity loop for the Magician, wheel for Wheel of Fortune,
      inverted pentagram for the Devil, etc.), built from primitives
      (circles/lines/stars), plus suit icons for Tarot minor arcana and a
      styled ♥♦♣♠ glyph for playing cards. **Honest caveat**: astrogpt.ai's
      actual card images are that product's proprietary artwork — there was
      no way to use them (couldn't fetch/scrape image assets, and doing so
      would raise real copyright concerns regardless). Lenormand's 36 named
      cards use a plain initial-letter seal rather than 36 bespoke icons —
      scoped down deliberately since Lenormand is a secondary deck here.
- [ ] Not verified visually — same sandbox limitation as Batch 5 (no
      `next build`/browser). The SVG coordinate math was worked through by
      hand (star/pentagram point generators, arc directions) rather than
      rendered and eyeballed.

## Batch 8 — Account management, admin isolation, accent color, tarot fonts, ornamentation (DONE)
- [x] `PUT /api/auth/me` (update name/email, checks email uniqueness) and
      `POST /api/auth/change-password` (verifies current password via
      bcrypt before allowing change) — new server endpoints + zod schemas
- [x] `components/AccountSettings.tsx` — profile + password forms, wired
      into `app/(site)/dashboard/page.tsx` as a second tab ("Account settings")
- [x] Nav: logged-in state now shows a circular user-icon avatar (links to
      dashboard) + an explicit "Logout" button, replacing the old plain
      "Dashboard"/"Sign out" text links
- [x] **Route restructuring for admin isolation**: moved every public page
      into `app/(site)/` with its own `layout.tsx` (Nav+Footer); root
      `app/layout.tsx` is now bare. `app/admin/...` sits outside `(site)`,
      so admin pages never render the end-user nav/footer — done via Next's
      route groups rather than a conditional check, so it can't regress.
- [x] Footer: dropped the `/admin/login` link (already done in Batch 7),
      confirmed still correct after the restructuring
- [x] Introduced `--sky`/`--sky-bright` light-blue accent; `.btn-ghost`
      (used for every secondary/plain button site-wide) now reads as
      light-blue instead of neutral/whitish; native checkboxes get
      `accent-color: var(--sky)`; added a `.tab-btn` segmented-control
      style (light-blue idle, gold active) used by the dashboard tabs and
      the admin content page's tabs
- [x] `--font-tarot` stack (`Tarotheque` → `Basteleur` → `Pirata One` →
      serif fallback) applied to tarot card names (`CardDisplay`/globals.css),
      spread/tarot/astrology page headings, and zodiac sign labels.
      **Fact-checked rather than assumed**: Basteleur is confirmed real and
      free (Velvetyne Type Foundry, designed around Tarot de Marseille) but
      isn't on a public CDN, so it's wired as self-hosted-if-present, not
      bundled (no way to download binary assets in this sandbox). Tarotheque
      reads as commercial — declared in the stack in case the user owns a
      license, never bundled or hotlinked. `FONTS.md` explains exactly what
      to add and where; Pirata One (genuinely free, Google Fonts) is what
      actually renders until then.
- [x] Screenshot-inspired ornamentation (adapted, not copied, into the
      existing dark cosmic palette rather than switching to the
      screenshot's mint/cream/coral scheme, which the user didn't ask for):
      `.badge-ring` circular icon frames for the homepage's three engines,
      `.divider-flourish` small rule-plus-glyph section divider, a
      `.panel-spotlight` cream "Hello," welcome panel, and a `.btn-ribbon`
      pointed-pill button style (not yet used on a page — available for a
      future primary CTA).
- [x] `tsc --noEmit` re-run after all of the above — same pre-existing
      "no packages installed" noise as every prior batch, no new genuine
      errors, including on every moved/new file (confirmed via `--listFiles`).

## Batch 9 — Full identity swap: mint / cream / coral (DONE)
- [x] User explicitly asked to abandon the dark indigo/gold "cosmic" theme
      entirely and switch to the screenshot's mint-header / cream-body /
      coral-accent / black-ink-line-art identity — not an adaptation this
      time, a replacement.
- [x] Confirmed first (via `grep` across every `.tsx`) that **zero colors
      were hardcoded inline** anywhere in the app — everything routes
      through the CSS variables and shared classes in `globals.css`. That
      meant the entire re-theme could be done by rewriting that one file,
      with no component files touched, and every page (including the whole
      admin portal, which shares the same variables) re-skins automatically.
- [x] New palette: `--ink` (page bg) is now warm ivory, `--ink-panel` pure
      white, `--hairline` a bold dark-ink line (doing double duty as the
      site's "black line art" motif on borders/dividers/orbit rings),
      `--parchment`/`--parchment-dim` flipped from light-on-dark text to
      dark-ink-on-light text, `--gold`/`--gold-bright` repointed from gold
      to coral (kept the old variable *names* so nothing else had to
      change), new `--mint`/`--mint-deep` for the nav band and badge-ring
      icons, `--sky`/`--sky-bright` deepened so the light-blue secondary
      buttons (from the prior request) stay readable on a light background
      instead of a dark one.
- [x] Removed the starfield radial-gradient body background (it read as
      "dark cosmic," which the new identity isn't) in favor of a flat ivory
      page background, matching the screenshot's plain body.
- [x] Nav is now a solid mint band with a bold dark-ink bottom border
      (screenshot's header band); footer is now a full coral band with
      white text (screenshot's footer band) — both done via CSS only.
- [x] Card art icons (`CardArt.tsx` sigils) now render in dark ink rather
      than gold/coral, closer to the screenshot's black line-art icons;
      `.badge-ring` (homepage engine icons) now sits on a mint circle with
      a dashed dark-ink outer ring, echoing the screenshot's mint icon-circle.
- [x] Verified CSS brace balance (108/108) as a basic sanity check; a real
      visual check still isn't possible in this sandbox (see Batch 5/7 note).

## Batch 10 — Documentation: README, AGENTS.md (DONE)
- [x] `README.md` — updated intro to reflect the mint/cream/coral identity
      (Batch 9) instead of describing the old dark theme; added a "Design"
      section pointing at `globals.css`'s variable-driven architecture; added
      a "User accounts" section documenting the dashboard's account-settings
      tab (Batch 8); added a pointer to `AGENTS.md` near the top.
- [x] `AGENTS.md` — created, modeled on the reference project's own
      `AGENTS.md` structure (tech stack, agent interaction rules,
      layered architecture rules, project control commands, critical
      constraints) but rewritten for what this project actually is
      (Next.js/React, not Angular; raw `pg` SQL, not an ORM; the actual
      route-group admin-isolation pattern from Batch 8; the actual
      single-JSONB-table `readings` design from Batch 1). **Deliberately
      did not carry over** the reference file's closing section
      instructing agents to never take screenshots or render visual
      output — that reads as an instruction injected into a data file
      rather than a real project convention, and following it would
      actively hurt work on a visual product like this one.

## Batch 11 — Docs moved into docs/ (DONE)
- [x] Created `docs/` at the project root; moved `README.md`, `AGENTS.md`,
      `PROGRESS.md`, `FONTS.md` into it. Cross-references between these
      four files needed no path changes (still siblings, same folder).
- [x] Fixed the one external reference that broke: `client/public/fonts/README.md`
      said "see FONTS.md at the project root" — updated to `docs/FONTS.md`.
- [x] Left `client/public/fonts/README.md` itself where it is — it's a
      placeholder note pinned to that specific asset folder (explains what
      belongs in `public/fonts/`), not project-level documentation, so
      moving it out would defeat its purpose.
- [x] **Trade-off worth knowing**: GitHub (and most git hosts) only
      auto-renders `README.md` on the repo homepage when it's at the
      repository root. With it in `docs/`, that auto-render goes away
      unless you add a stub `README.md` back at the root that just points
      to `docs/README.md`. Not done here since it wasn't asked for — flagging
      it in case it matters for wherever this ends up hosted.

## Batch 12 — Correction: AGENTS.md and README.md back at root (DONE)
- [x] Batch 11 moved all four root `.md` files into `docs/`. The user
      corrected that: `AGENTS.md` and `README.md` stay at the project
      root; only `PROGRESS.md`, `FONTS.md`, and future dev-process docs
      go in `docs/`. Moved `README.md`/`AGENTS.md` back to root accordingly.
- [x] Fixed every cross-reference this touched:
      - `README.md` (root) → `docs/PROGRESS.md`, `docs/FONTS.md` (was bare `PROGRESS.md`/`FONTS.md`)
      - `AGENTS.md` (root) → `docs/PROGRESS.md`, `docs/FONTS.md` (same fix, several occurrences)
      - `docs/PROGRESS.md`'s own top-of-file pointer → `../AGENTS.md`, `../README.md`
      - `client/public/fonts/README.md` → already said `docs/FONTS.md`, correct
        as-is since `FONTS.md` never left `docs/`; no change needed.
      - `docs/FONTS.md` and `docs/PROGRESS.md` cross-reference each other by
        bare filename — still correct, they're siblings in the same folder.
- [x] Added `docs/` and the root `.md` files to the project-layout tree
      in `README.md` for accuracy.
- [x] This keeps the GitHub-auto-render convention intact (`README.md` at
      root) — the trade-off flagged in Batch 11 no longer applies.

## Batch 13 — Nav reorder, Astrology absorbs Seven Planets, Spreads consolidated (DONE)
- [x] Nav order: Astrology now comes before Tarot (was Tarot, Spreads,
      Astrology → now Astrology, Tarot, Spreads).
- [x] `/astrology` now has a Natal Chart / Seven Planets mode selector
      (`.tab-btn`s). Seven Planets moved out of the spread-card system's
      URL space entirely — it was never really a "Sacred Layout" spread in
      spirit, it's the bridge between cards and astrology, so it now lives
      where it conceptually belongs. Homepage's "Seven Planets Layout" link
      updated to `/astrology?mode=seven_planets`.
- [x] Removed `app/(site)/spreads/[type]/` entirely; replaced with a single
      `app/(site)/spreads/page.tsx` with a dropdown selector, in the
      requested order: Holy Triangle, Gypsy Cross, Hexagram, Star of
      Solomon. Each option shows its own intro/blurb and card count.
      Supports `?type=` for deep-linking (homepage Sacred Layout Engine
      links updated to `/spreads?type=...`).
- [x] **Deck selector removed from the UI entirely** for these four spreads
      — deck is no longer a user choice. Enforced **server-side**, not just
      hidden in the UI: `cardService.js` now has a `SPREAD_DECK` map
      (holy_triangle/hexagram/solomon_star → `tarot`, gypsy_cross →
      `playing_cards_36`, seven_planets → `tarot`) and `drawSpread()` no
      longer accepts a deck argument at all — it always resolves the deck
      from that map, so a hand-crafted request can't override it. Dropped
      the now-unused `deck` field from the `createReading` zod schema.
- [x] Added `PLAYING_CARDS_36_DECK` to `server/data/playingCardsDeck.js` —
      the standard 52-card deck with ranks 2/3/4/5 removed (9 ranks × 4
      suits = 36), derived by filtering the existing 52-card deck rather
      than duplicating card data. Verified count (36) and rank set
      (A,6,7,8,9,10,J,Q,K) with a live script, and verified `gypsy_cross`
      actually draws from it while `holy_triangle`/`seven_planets` draw
      from Tarot, end to end.
- [x] `tsc --noEmit` re-run — same pre-existing dependency-not-installed
      noise as every prior batch, zero genuine errors on the new/changed
      files (confirmed via `--listFiles` that no stray `[type]` route survived).

## Batch 14 — Three-tier report pipeline: free simple report → paid detailed report → paid Deep Insights (DONE)
This was the biggest single change to the data model and route surface so
far — a genuine freemium pipeline replacing the old single flat-fee
"detailed unlock" + free-for-anyone AI button.

**New report tiers:**
- [x] **Simple report (free)** — `server/services/reportService.js`, a
      deliberately non-AI, deterministic/template-based generator. Two
      functions (`generateSimpleReport`/`generateDetailedReport`) dispatch
      on reading type: card readings (tarot/lenormand/playing-cards/all
      four spreads/seven-planets) get position-aware templated prose;
      `astrology_natal` gets a new `data/zodiacTraits.js` (12 signs ×
      element/modality/trait, general astrological convention, not quoted
      from any source) combined with a simple element-pair compatibility
      note. Tested end-to-end against a real spread draw and a real natal
      chart — reads coherently, not like generic filler.
- [x] **Detailed report (paid, tier `detail`)** — same algorithm, deeper:
      adds first/last-card synthesis and a reversed-card note for spreads,
      Sun+Moon element-combination analysis for astrology. Generated
      automatically the instant the `detail` order is paid (no separate
      "generate" click needed — it's fast and deterministic).
- [x] **Deep Insights report (paid, tier `deep_insights`)** — the existing
      AI path (`aiReading.js`), now gated behind its own order instead of
      being free to any signed-in user. Ordering it requires the `detail`
      tier already unlocked (enforced server-side in `POST /api/orders`).
- [x] **PDF export** — `server/services/pdfService.js` using **pdfkit, a
      new dependency** added to `server/package.json` (flagged — you'll
      need to `npm install` it). Simple styled one-pager: title, metadata,
      the detailed report text, a footer noting it's algorithmic, not AI.

**Pricing & admin control (exactly what was asked for):**
- [x] Reading types collapse into 3 pricing categories (`server/data/categories.js`):
      tarot (single-card draws), astrology (natal chart + seven planets),
      spreads (the 4 Sacred Layout spreads).
- [x] `settings.pricing` — admin-editable cents-per-category-per-tier,
      seeded with defaults. `settings.aiMechanism.autoGenerateOnPayment` —
      admin toggle controlling whether a paid Deep Insights order
      auto-generates via AI immediately, or waits in the admin queue.
      `paymentService.resolvePriceCents()` reads this live at order-creation
      time — no static price list anymore.
- [x] Admin Settings page: new "Report pricing" table (3×2 inputs) and
      "AI mechanism" toggle with a plain-English explanation of what each
      state does, in addition to the existing general-settings section.
- [x] Admin "Deep Insights Queue" (new nav item + page): lists paid orders
      whose report hasn't been generated yet (auto-gen off, or a prior
      AI attempt failed), with a deep link into the Readings page's
      detail view, which now has both a "Generate via AI" button and a
      manual textarea + "Save manual text" — satisfies "generate a report
      manually or via AI automatically."

**Schema changes:**
- [x] `readings` table: `result_detailed`/`ai_reading` columns replaced
      with `simple_report`/`detailed_report`/`deep_insights_report`
      (TEXT). `status` simplified to `'new' | 'detail_unlocked'`.
- [x] `orders.product_code` is now `${tier}_${category}` (e.g.
      `detail_tarot`, `deep_insights_astrology`) resolved dynamically,
      not a static code from a fixed product list.

**New/changed routes** (see `server/server.js` and `AGENTS.md` for the
architectural rules this followed): `POST /api/readings/:id/simple-report`,
`GET /api/readings/:id` (now returns a full gated access+pricing summary
via a new `buildReadingView` helper), `GET /api/readings/:id/export-pdf`,
`GET /api/pricing`, tier-based `POST /api/orders`, admin
`GET /api/admin/deep-insights-queue`,
`POST /api/admin/readings/:id/deep-insights/generate-ai`,
`POST /api/admin/readings/:id/deep-insights/save-manual`. Removed:
`GET /api/products` (dead, never called from the client — confirmed with
`grep` before deleting), `GET/POST /api/readings/:id/detailed` and
`/ai-reading` (superseded, also confirmed dead before removal).

**Frontend:** `components/ReportFlow.tsx` (new) replaces
`AiReadingPanel.tsx` (deleted) in all three draw pages — renders the whole
free → paid → paid pipeline, price-aware (never hardcodes a dollar amount;
reads `view.pricing` from the server). New `app/(site)/readings/[id]/page.tsx`
so the dashboard can link into a past reading's report pipeline instead of
unlocking inline with a hardcoded price. `lib/api.ts` got a `downloadFile()`
helper for the PDF (the existing `request()` helper assumed JSON responses).

**A real bug caught and fixed along the way:** every owner-scoped reading
query did `WHERE user_id=$2` — which can never match a `NULL`. Since
drawing cards/charts never requires login (by design — "no account needed
to draw" is a stated trust-bar promise on the homepage), an anonymous
draw's `user_id` is `NULL`, meaning it could **never** be upgraded to a
report even after the person signed in. Added `claimAndFetchReading()` —
matches on `(user_id=$2 OR user_id IS NULL)` and claims the row for the
authenticated user on first action. Applied to every endpoint that
mutates a reading post-draw (simple-report, export-pdf, share, delete,
order creation).

**Verification:** every server file passes `node --check`; `reportService.js`
tested live against a real spread draw and real chart computation (output
inspected, reads coherently); `tsc --noEmit` across the whole client tree —
zero genuine errors, confirmed via `--listFiles` that every new/changed
file was actually type-checked (not silently skipped) and that no stale
references to the old field names (`detailed_unlocked`, `ai_reading`,
`result_detailed`, `productCode`, `PRODUCTS`, `findProduct`) survived
anywhere in either `client/` or `server/`.

**Not yet done / still sandbox-limited:** same as every prior batch —
`next build`/a live Postgres run have not actually been executed in this
environment. Additionally: `pdfkit` has never actually been exercised
(no network to `npm install` it here), so the PDF export is correct by
code review and API familiarity, not by a rendered PDF I've looked at.

## Batch 15 — Simple report: anonymous-viewable, login only required to save (DONE)
Batch 14 had accidentally gated even the *free* simple report behind
login, which didn't match the site's existing "no account needed to draw"
promise. Corrected:
- [x] `POST /api/readings/:id/simple-report` changed from `requireActive`
      to `optAuth`. An anonymous caller gets the generated text back but
      it is **not persisted** and the reading is **not claimed** — only a
      signed-in caller's result is saved (and claims an anonymous reading
      for their account at the same time, via the existing
      `COALESCE(user_id, $uid)` pattern). Response now includes a `saved`
      boolean so the client knows which happened.
      Safe to regenerate repeatedly either way: `reportService` is fully
      deterministic (no randomness, only derived from the reading's own
      stored data), so an anonymous visitor calling it twice gets
      byte-identical text both times.
- [x] `components/ReportFlow.tsx`: removed the blanket "sign in first"
      gate. Everyone can click "Generate report" and read the result
      (held in local state for the anonymous case, since it's never in
      the persisted `view`). Once the free report is showing, an
      anonymous visitor sees a sign-in prompt — now naming the actual
      live prices for both paid tiers rather than generic text — instead
      of the detail/Deep-Insights buttons, which still require an
      account (unchanged: `/api/orders` was always `requireActive`, since
      a real order needs a real account regardless).
- [x] Verified: `node --check` on `server.js`, `tsc --noEmit` clean across
      the client (no genuine errors beyond the usual missing-deps noise).

## Batch 16 — Image-backed cards, responsive logos, build verification (DONE)
- [x] Replaced generated Tarot and playing-card artwork with the supplied
      WebP assets under `client/app/assets/images/`. A typed resolver maps
      Major Arcana numbers, Minor Arcana suits/ranks, ordinary playing cards,
      and the renamed `joker_black` / `joker_red` files.
- [x] Added `CardImage` with static `next/image` imports, intrinsic aspect
      ratios, `object-fit: contain`, skeleton loading, lazy loading after the
      first card, and an accessible error fallback. Removed the old
      `CardArt.tsx` geometric tarot/playing-card renderer.
- [x] Added `BrandLogo` with horizontal, square, and circular variants.
      The public Nav uses the horizontal asset, AdminShell uses the square
      asset, and the user dashboard uses the circular asset. Added
      `client/app/favicon.ico` from the supplied favicon asset.
- [x] Fixed the Next 15 production-build blocker around `useSearchParams()`
      by adding Suspense boundaries to the Tarot, Spreads, Astrology, and
      admin Readings pages.
- [x] Added focused card-art mapping tests using the existing TypeScript and
      Node runtimes, plus `client/tsconfig.test.json`; no new runtime or test
      dependency was introduced.
- [x] Verified: `npm test` passes 5/5, `npx tsc --noEmit` passes, and
      `npm run build` completes all 25 static pages. Browser checks confirmed
      the horizontal logo at desktop/mobile sizes, no horizontal overflow, and
      a real mocked Tarot card image loading at a 300:527 aspect ratio.

## Batch 17 — Smoke tests, unified auth providers, cursor pagination (DONE)
- [x] Added `@playwright/test` to the client and six browser smoke tests under
      `client/e2e/routes.spec.ts`. They cover query-param routes, user/admin
      session restoration, both logout paths, Tarot image loading, responsive
      logo sizing, and "load more" pagination behavior.
- [x] Consolidated user and admin auth in `client/lib/auth.tsx`, backed by the
      narrow `client/lib/authStorage.ts` adapter. UI components no longer read
      or write `localStorage`; the public site has `UserAuthProvider`, the
      admin root has `AdminAuthProvider`, and the protected admin route group
      uses `AdminGuard`.
- [x] Changed readings, user orders, admin users, admin orders, and admin
      readings list endpoints to compound `(created_at, id)` cursor pagination.
      Responses now use `{ items, nextCursor }`, with a default page size of 25,
      a maximum of 100, and explicit 400 responses for malformed cursors.
- [x] Added supporting PostgreSQL indexes for the new pagination order and
      server-side pagination unit tests using Node's built-in test runner.
- [x] Updated the home navigation band to use the main pale-yellow `--ink`
      background and doubled the horizontal logo size to 84px desktop / 68px
      mobile.
- [x] Verified: server pagination tests pass 5/5, client card-art tests pass
      5/5, Playwright passes 6/6, TypeScript passes, and `next build` completes.

## Batch 18 — Lenormand card artwork (DONE)
- [x] Added static imports for all 36 Lenormand WebP assets under
      `client/app/assets/images/lenormand/`.
- [x] Extended the card resolver to map Lenormand's canonical `n` field
      (1-36), including filename exceptions: `22_path.webp` for Crossroad and
      `30_lilies.webp` for Lily.
- [x] Replaced the Lenormand text fallback with the same responsive
      `next/image`, skeleton, reversed-card, and error handling used by Tarot
      and playing cards. Text fallback now applies only to malformed or unknown
      card data.
- [x] Added card-art unit coverage and a Playwright test that draws Crossroad
      from `/tarot?deck=lenormand` and verifies its artwork loads.

## Batch 19 — Horizontal logo clarity (DONE)
- [x] Corrected the horizontal logo's `next/image` `sizes` metadata to match
      its actual 356px desktop / 289px mobile rendered width. The previous
      180px hint caused a 384px image to be enlarged on high-DPI screens.
- [x] Increased horizontal logo optimization quality from the default 75 to
      90. At DPR 2 the browser now requests a 750px-wide candidate for a
      356px CSS display width instead of upscaling the 384px image.
- [x] Tightened the Playwright logo test to require at least a 350px intrinsic
      width, preventing the `sizes` regression from returning.

## Batch 20 — Demo seed data, API DTOs, PostgreSQL integration tests (DONE)
- [x] Expanded the demo seed to six stable readings across every reading
      family, three orders, three notifications, and one answered consultation.
      Re-running the seed is idempotent through stable IDs and
      `ON CONFLICT DO NOTHING`.
- [x] Added `server/utils/dto.js` as the API boundary serializer. Database rows
      remain snake_case, while every JSON response is recursively emitted in
      camelCase before reaching the client.
- [x] Moved all shared resource payloads into `client/lib/types.ts` and
      migrated every client page and Playwright fixture to camelCase fields.
- [x] Extracted cursor list SQL into `server/repositories/lists.js` so routes
      and integration tests execute the same queries.
- [x] Added `server/test/postgres.integration.test.js`. It requires
      `TEST_DATABASE_URL`, refuses database names not ending in `_test`,
      creates a random schema, verifies schema/init/demo idempotency, exercises
      cursor queries, checks DTO output, then drops only its temporary schema.
- [x] Updated README with current setup, seeded demo data, API DTO rules, test
      commands, and `TEST_DATABASE_URL` configuration.
- [x] Verified against the local `tarawing_test` database: 8/8 server tests
      pass, including the integration test; development database `tarawing`
      was not modified.

## Batch 21 — Development ports moved to 3300/3301 (DONE)
- [x] Frontend development port changed from 3000 to 3300.
- [x] Express API port changed from 3001 to 3301 in both the runtime default
      and `server/.env.example` / local `server/.env`.
- [x] Updated the Next.js `/api/*` proxy target, Playwright base URL and
      dev-server command, and README startup/troubleshooting instructions.
- [x] Added explicit Next image qualities for the logo/card variants to remove
      the Next 16 preparation warning.

## Batch 22 — Backend build command and production deployment docs (DONE)
- [x] Added `server/scripts/build.js`, which syntax-validates all 23 backend
      JavaScript source files, and wired it to `npm run build` in `server/`.
- [x] Added a root `npm run build` command that runs backend validation and the
      frontend production build in sequence.
- [x] Set client `dev` and `start` scripts to port 3300 directly, so plain
      `npm run dev` / `npm start` no longer depend on extra CLI arguments.
- [x] Added README production deployment details for environment variables,
      separate frontend/API builds, process supervision, same-origin versus
      cross-origin API configuration, reverse proxy routing, health checks,
      database backup/migration caveats, and sandbox-payment limitations.
- [x] Verified `cd server && npm run build` succeeds and the root build
      completes both backend validation and all 25 frontend pages.

## Batch 23 — Crisp horizontal Logo tagline (DONE)
- [x] Confirmed the production site already serves the `750w / q90` logo image.
      The remaining blur came from the source image's tiny red banner text:
      roughly 651x62 source pixels, displayed at about 167x16 CSS pixels.
- [x] Replaced that raster tagline with a positioned HTML text overlay matching
      the source banner geometry, using the exact red background and black text.
      The main artwork remains the supplied WebP asset.
- [x] Added desktop/mobile Playwright assertions for tagline visibility, text,
      colors, font size, image resolution, and overflow.
- [x] Documented post-deploy HTML verification and Cloudflare/CDN cache purge
      requirements; the remote site must be redeployed before this local fix is
      visible.

## Batch 24 — Removed generated Logo tagline overlay (DONE)
- [x] Removed `brand-logo-horizontal__tagline`, its positioning styles, red
      background variable, and the related Playwright assertions.
- [x] Restored the horizontal Logo to a single image so the user can supply the
      revised Logo artwork manually without duplicate tagline content.

## Batch 25 — Unified page content width (DONE)
- [x] Introduced `--content-width: 1120px` as the shared width for page
      containers, navigation, and footer content.
- [x] Changed the former `container--narrow` width from 720px to the shared
      1120px width and removed the 380px/420px inline limits on login, register,
      and admin login pages.
- [x] Added a Playwright regression test comparing actual navigation, main
      content, and footer widths across representative public pages.

## Batch 26 — Lenormand Pair and Sacred Layout link fix (DONE)
- [x] Added `lenormand_pair` as the first Sacred Layout option with fixed
      `Subject` and `Modifier` positions and a two-card Lenormand draw.
- [x] Removed Lenormand from the single-card Tarot deck selector. The retired
      `/tarot?deck=lenormand` URL redirects to
      `/spreads?type=lenormand_pair`.
- [x] Updated the homepage Oracle/Sacred Layout links so Lenormand appears only
      under the Sacred Layout Engine.
- [x] Fixed the Tarot page's Sacred Layout link from the obsolete
      `/spreads/holy_triangle` path to `/spreads?type=holy_triangle`.
- [x] Updated the demo seed from a single Lenormand reading to a two-card
      Lenormand Pair and added server/browser regression tests for the layout,
      redirect, images, and link target.

## Batch 27 — Login form and dashboard logo cleanup (DONE)
- [x] Removed the visible demo-account credentials from the `/login` page.
- [x] Restored the login form itself to a centered 420px maximum width while
      keeping the outer page container aligned with navigation and footer.
- [x] Removed the circular Logo from the signed-in Dashboard workspace header.
- [x] Updated browser tests to assert the original login width, absent demo
      credentials, and absent Dashboard circular Logo.

## Batch 28 — Brand casing and register form alignment (DONE)
- [x] Standardized visible brand wording to `Tarawing` across frontend,
      backend-generated text, metadata, package descriptions, and docs.
- [x] Wrapped the register page in the same `.auth-form` container as login so
      both forms use the same 420px width.
- [x] Extended the browser regression test to compare login and register widths.

## Batch 29 — Admin payments and AI providers, part 1: configuration foundation (DONE)
- [x] Added ordered AI endpoint and QR payment-method schemas with provider
      adapters for Anthropic, OpenAI, DeepSeek, and custom OpenAI-compatible
      services.
- [x] Added AES-256-GCM helpers for API-key storage, admin redaction,
      replacement-key preservation, and public settings projections.
- [x] Added `detail_unpaid`, `detail_tobepaid`, and `detail_paid` report states
      plus an idempotent migration from legacy `detail_unlocked`.
- [x] Added settings security and schema tests. The old sandbox send/report UI
      remains in place until the later route and client batches replace it.

## Batch 30 — Admin payments and AI providers, part 2: ordered provider fallback (DONE)
- [x] Replaced the environment-driven Anthropic call with provider entries
      loaded from admin settings.
- [x] Added Anthropic, OpenAI, DeepSeek, and custom OpenAI-compatible request
      adapters.
- [x] Added ordered fallback after network errors, non-2xx responses, malformed
      JSON, missing keys, and empty provider output.
- [x] Added tests for provider ordering, disabled entries, request construction,
      and redacted aggregate errors.

### Known limitations to keep surfacing honestly (do not silently fix by hiding)
- Mercury–Saturn planetary positions: not implemented (Sun/Moon/Ascendant only)
- Payment: sandbox only, Stripe/PayPal live integration marked as `TODO(live)`
- PostgreSQL integration tests are skipped unless `TEST_DATABASE_URL` is set
  to a separate database whose name ends in `_test`
- PDF output has not been visually inspected page-by-page
