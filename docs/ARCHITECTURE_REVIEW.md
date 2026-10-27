# TaraWing Architecture Review

Reviewed: 2026-10-26

Scope: client rendering/data flow, server route boundaries, asset handling,
authentication state, build behavior, and scaling risks. This is a targeted
review of the current codebase, not a claim that every runtime path has been
integration-tested against PostgreSQL.

## Implementation status

The first release-gate issue, auth state consolidation, and cursor pagination
have since been implemented:

- Playwright now covers query-param routes, auth/logout, card images, logo
  sizing, and paginated "load more" behavior.
- `client/lib/auth.tsx` provides user and admin providers over one storage
  adapter; UI components no longer touch `localStorage`.
- Readings, user orders, admin users/orders/readings use compound cursors and
  return `{ items, nextCursor }`.

The route-file decomposition remains outstanding. API DTO normalization and
PostgreSQL integration coverage are now implemented.

## Top three systemic issues

### 1. Release-critical route assumptions were not covered by verification

The first production build failed because four pages called
`useSearchParams()` outside a Suspense boundary. This is now fixed in:

- `client/app/(site)/tarot/page.tsx`
- `client/app/(site)/spreads/page.tsx`
- `client/app/(site)/astrology/page.tsx`
- `client/app/admin/(dashboard)/readings/page.tsx`

Root cause: route-level framework constraints were being verified by type
checking only. TypeScript cannot detect Next.js prerender requirements.

Implemented guard: `npm run build` remains the release gate, and
`client/e2e/routes.spec.ts` now covers the query-param routes.

### 2. `server/server.js` combines too many responsibilities

`server/server.js` is 637 lines and currently owns authentication routes,
reading creation, report pipeline, orders, consultations, admin CRUD, content,
settings, and audit behavior. Business logic has been partially extracted into
`server/services/`, but route orchestration still changes one large file.

Recommended boundary:

- `routes/auth.js`
- `routes/readings.js`
- `routes/orders.js`
- `routes/admin.js`
- `routes/content.js`
- `routes/index.js`

Keep the existing service layer. Do not introduce a framework or ORM merely to
split the routes; the current Express + parameterized SQL approach is adequate.

### 3. Client feature request state remains repetitive

Authentication is centralized and API responses now pass through one camelCase
DTO boundary. Feature pages still repeat fetch/error/loading state.

Recommended boundary:

- Feature hooks such as `useReadings`, `useAdminReadings`, and
  `useReadingActions` instead of repeated effect/fetch/try/catch blocks.

## Card rendering implementation

- `client/lib/cardArt.ts` is a pure resolver. It maps card data to stable asset
  keys and is covered by unit tests.
- `client/lib/cardArtAssets.ts` uses static imports, allowing Next to validate
  every asset path at build time and generate optimized image metadata.
- `client/components/CardImage.tsx` owns image loading, skeleton state,
  reversed-card rotation, lazy loading, and error fallback.
- `client/components/CardDisplay.tsx` remains the presentation boundary, so
  the three existing call sites did not need API or component-shape changes.
- Lenormand resolves all 36 cards by their canonical `n` field and uses the
  same image loading path. Its filename exceptions (`22_path`, `30_lilies`)
  stay isolated in the resolver rather than leaking into components.

## Logo implementation

`client/components/BrandLogo.tsx` is the only logo entry point:

| Variant | Asset | Used by |
| --- | --- | --- |
| `horizontal` | `logo-horizontal.webp` | public Nav |
| `square` | `square_icon.webp` | AdminShell |
| `circular` | `round_icon.webp` | user workspace header |

Logo dimensions are controlled with CSS variables, so a future collapsed
Admin sidebar can override `--brand-logo-size` without changing component
logic. `client/app/favicon.ico` uses the Next App Router favicon convention.

## Performance guidance

- Do not virtualize the current card layouts: the largest spread is 8 cards.
  Static imports, lazy loading after the first card, skeleton placeholders, and
  fixed aspect ratios solve the current cost.
- Cursor pagination is now in place for readings, users, and orders. Add
  virtualization only if those lists remain long after pagination and users
  routinely scroll through many pages.
- Debounce search input at the API boundary, not inside every table component.
- Add React Query/TanStack Query only if caching, retries, invalidation, and
  request deduplication become recurring needs across multiple screens.
  Introducing it now would add dependency surface without replacing enough
  duplicated logic.

## Suggested delivery order

1. Split `server.js` by route domain while preserving service interfaces.
2. Extract repeated feature request state into hooks.
3. Add API route-level integration tests before any live payment integration.
