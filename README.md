# Tarawing — Read the Cosmos. Find Your Path.

Astrology, Tarot, Lenormand, and sacred-geometry card spreads, with
AI-generated readings, per-user account management, and a full admin
portal. Built following the navigation and tool structure in the original
design brief (`tarawing_design.txt`), reusing the architectural patterns of
a reference Express/PostgreSQL/Angular project (auth, admin RBAC,
order/payment state machine, JSONB report storage) — reimplemented here
with **Next.js instead of Angular**, entirely in English. Visual identity
is mint / cream / coral with dark-ink line art (see "Design" below), not
the reference project's own look.

If you're an AI coding agent picking this repo up, read **`AGENTS.md`**
first — it has the actual architecture rules and constraints this project
follows. `docs/PROGRESS.md` has the full batch-by-batch build log.

## Stack

- **Frontend**: Next.js 15 (App Router) — chosen per `tech_stack.txt`'s
  Next.js/Nuxt recommendation, for the same SSR/SEO reasons it gives.
- **Backend**: Node.js + Express 4 + PostgreSQL (`pg`), JWT auth (`jsonwebtoken`),
  password hashing (`bcryptjs`), validation (`zod`).
- **AI readings**: calls the Anthropic Messages API directly from
  `server/services/aiReading.js`.
- **Payments**: sandbox-only in this build (see Limitations).

## Ports

- Frontend (Next.js): [http://localhost:3300](http://localhost:3300)
- Backend API (Express): [http://localhost:3301](http://localhost:3301)
- Browser requests to `/api/*` on port `3300` are proxied to port `3301` in
  development through `client/next.config.js`.

The backend port is controlled by `PORT` in `server/.env`. A non-default API
origin can be selected with `API_PROXY_TARGET` for the frontend, and Playwright
can target another frontend with `PLAYWRIGHT_BASE_URL`.

## Project layout

```
tarawing/
├── AGENTS.md          AI-agent contribution rules (kept at root — read this first)
├── README.md          this file (kept at root)
├── docs/              PROGRESS.md (build log) + FONTS.md + future dev-process docs
├── server/            Express API — see server/server.js for the full route list
│   ├── db/            schema + seed data
│   ├── middlewares/   auth (user JWT + admin JWT/RBAC), zod validation
│   ├── schemas/       zod request schemas
│   ├── data/          tarot/lenormand/playing-card decks, spread layouts
│   ├── services/      card drawing, astrology calc, AI reading, sandbox payment
│   ├── repositories/  shared cursor-paginated PostgreSQL queries
│   └── utils/         structured logger, pagination, API DTO serialization
└── client/            Next.js app
    ├── app/           pages (App Router)
    │   ├── layout.tsx      root layout — deliberately bare (no Nav/Footer)
    │   ├── (site)/         public pages — this route group's own layout.tsx
    │   │                   adds Nav + Footer, so only these pages get them
    │   └── admin/          admin portal — sits OUTSIDE (site), so it never
    │                       gets the end-user nav/footer.
    │                       (dashboard) route group inside is auth-guarded;
    │                       login/ deliberately sits outside that guard.
    ├── components/    Nav, Footer, image cards, report flow,
    │                  AccountSettings, admin AdminShell
    └── lib/           API client, shared types, user/admin auth providers
```

## First run

Prerequisites: Node.js, npm, and PostgreSQL. Create the development database
and, if you want to run PostgreSQL integration tests, a separate test
database whose name ends in `_test`:

```bash
createdb tarawing
createdb tarawing_test

# Backend
cd server
cp .env.example .env     # set DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET, ADMIN_TOKEN
npm install
npm run dev              # http://localhost:3301 — creates schema + seeds demo data

# Frontend, in a second terminal
cd client
npm install
npm run dev               # http://localhost:3300 — proxies /api/* to :3301 in dev
```

Demo user: `demo@tarawing.app` / `demo2026`.
Admin: username from `ADMIN_USERNAME` (default `admin`), password from
`ADMIN_TOKEN` in `server/.env`.

Or from the repo root, `npm install && npm run dev` runs both via `concurrently`.

On every normal startup, the demo user is created if missing, then seeded
idempotently with six readings across Tarot, Lenormand Pair, playing cards,
astrology, and spreads; three orders; three notifications; and one answered
consultation. Stable demo IDs and `ON CONFLICT DO NOTHING` mean restarting the
server does not duplicate rows.

Lenormand is available as the first option in **The Sacred Layout Engine**:
`/spreads?type=lenormand_pair`. It draws two cards with `Subject` and
`Modifier` positions. The old single-card URL
`/tarot?deck=lenormand` redirects to the pair layout.

## Environment variables (`server/.env`)

See `server/.env.example` for the full list with inline explanations.
The ones that matter most:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database for integration tests; its name must end in `_test` |
| `PORT` | Express API port; defaults to `3301` |
| `JWT_SECRET`, `ADMIN_TOKEN` | **Must** be real random values in production — the server refuses to boot with placeholders when `NODE_ENV=production` |
| `SETTINGS_ENCRYPTION_KEY` | Recommended dedicated key for encrypting AI provider credentials stored in PostgreSQL; falls back to `JWT_SECRET` if unset |
| `PAYMENT_MODE` | `sandbox` (default) simulates instant payment success for dev/testing |
| `DB_REINIT` | Defaults to `false`; set `true` only when intentionally wiping the development database |

### Admin-managed AI and payment configuration

The settings data model reserves ordered AI provider entries and QR payment
methods in the existing JSONB settings row. This groundwork includes strict
validation, AES-256-GCM encryption helpers for stored API keys, and admin-safe
redaction. Deep Insights generation now tries enabled Anthropic, OpenAI,
DeepSeek, or custom OpenAI-compatible providers in configured order, falling
back after failures. The settings screens and admin payment-verification
workflow are added in the following implementation batches.

## API DTOs

PostgreSQL rows remain `snake_case`. All JSON API responses pass through
`server/utils/dto.js`, which recursively converts keys to camelCase before
sending them. Client code must therefore consume `createdAt`, `resultBasic`,
`deepInsightsReport`, `amountCents`, and similar camelCase fields; it must not
read raw database column names.

## Tests

```bash
# Server: DTO, pagination, demo seed, and PostgreSQL cursor queries
cd server
npm test

# Client: card-art mapping
cd client
npm test

# Client browser smoke tests (uses local Chrome)
cd client
npm run test:e2e

# Optional: run Playwright against another frontend origin
PLAYWRIGHT_BASE_URL=http://localhost:3300 npm run test:e2e

# Client production build
cd client
npm run build
```

The PostgreSQL integration test creates a random schema inside
`TEST_DATABASE_URL`, writes only to that schema, verifies demo-seed
idempotency and cursor pagination, then drops the schema. It is skipped when
`TEST_DATABASE_URL` is unset. It refuses to run against a database whose name
does not end in `_test`.

## Production deployment

Tarawing deploys as two Node.js services backed by PostgreSQL:

| Service | Default port | Production command |
|---|---:|---|
| Next.js frontend | `3300` | `npm start` in `client/` |
| Express API | `3301` | `npm start` in `server/` |

Do not use `npm run dev` or `node --watch` in production. Put both services
behind a process manager or supervisor such as systemd, Docker, or your
platform's process runner, and terminate TLS at a reverse proxy.

### 1. Prepare production environment

Create a PostgreSQL database and take a backup before the first deployment.
Populate `server/.env` from `server/.env.example`; at minimum set:

```dotenv
NODE_ENV=production
PORT=3301
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/tarawing
JWT_SECRET=<strong-random-secret>
ADMIN_TOKEN=<strong-bootstrap-admin-password>
ADMIN_USERNAME=admin
DB_REINIT=false
ALLOWED_ORIGIN=https://app.example.com
LOG_FORMAT=json
```

`JWT_SECRET` signs both user and admin sessions. `ADMIN_TOKEN` is the initial
super-admin password created on first boot, despite its historical name.
The server refuses to start in production if either value is missing or still
uses a placeholder. `DB_REINIT=true` is also refused in production and must
never be used against a database containing real data.

The normal production boot creates missing tables and indexes, seeds admin
settings/FAQ/articles, and does **not** seed the demo user. This project does
not yet have versioned migrations, so take a backup and apply deliberate schema
migrations before deploying breaking database changes.

### 2. Build and start the API

```bash
cd server
npm ci
npm run build
npm start
```

`npm run build` performs syntax validation across all API source files.
Express is plain JavaScript, so no compiled output is produced. A successful
startup logs `Tarawing API listening on :3301`. Verify database connectivity:

```bash
curl --fail https://api.example.com/api/settings
```

### 3. Build and start the frontend

`NEXT_PUBLIC_API_BASE` is embedded into the browser bundle at build time. Set it
to the public API origin before `npm run build`; changing it later requires a
frontend rebuild.

```bash
cd client
npm ci
NEXT_PUBLIC_API_BASE=https://api.example.com npm run build
npm start
```

If the API is exposed at a different host, set the Express `ALLOWED_ORIGIN`
to the exact frontend origin and keep credentials enabled. For a same-origin
deployment where Next serves `/api/*`, set `API_PROXY_TARGET` so Next can proxy
to the local Express service.

### 4. Reverse proxy layout

A typical public layout is:

```text
https://app.example.com  -> 127.0.0.1:3300
https://api.example.com  -> 127.0.0.1:3301
```

Example Nginx location blocks:

```nginx
location / {
    proxy_pass http://127.0.0.1:3300;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Use the equivalent block with `3301` on the API hostname. Forward HTTPS headers
through the proxy and test both the frontend and authenticated API requests
after every deployment.

### 5. Production checks

```bash
# From the repository root
npm run build

# Server, with TEST_DATABASE_URL configured
cd server
npm test

cd ../client
npm test
npm run test:e2e
```

After deploying a frontend change, purge the CDN/Cloudflare cache for the HTML
document and confirm in the browser Network panel that the expected new build
assets are being served:

```bash
curl -fsSI https://app.example.com/ | grep -i cache-control
```

Hashed files under `/_next/static/` can be cached for long periods, but HTML
documents should not be given multi-month shared-cache lifetimes.

The current payment gateway is still sandbox-only and
`ANTHROPIC_API_KEY` is required for automatic AI-generated Deep Insights.
Do not advertise live payments or AI output until those integrations are
configured and tested in the production environment.

## Design

Warm pale-yellow header/page background, white cards, coral CTA buttons and
footer band, bold dark-ink borders and illustrated card assets — see
`app/globals.css`. Every component reads colors through CSS variables and
shared classes (`.btn-primary`, `.panel`, `.tag`, etc.) rather than literal
hex values. Tarot, Lenormand, and playing-card faces are supplied WebP images
loaded through `next/image` with skeleton and error states.

All public page containers, navigation, and footer content share the
`--content-width` variable (`1120px`) so their horizontal edges align at every
viewport width.

## Fonts

Card names and astro headings use `--font-tarot` (see `app/globals.css`).
Basteleur is a real free/open tarot-themed font but must be self-hosted;
Tarotheque's license couldn't be verified so it's never bundled. Both are
optional drop-in files — see `docs/FONTS.md` for exactly what to add and where.
Until you do, the free Pirata One (Google Fonts) is what actually renders.

## Known limitations — please read before relying on this

- **Planetary positions**: the natal chart calculates Sun, Moon, and
  Ascendant using genuine Meeus low-precision astronomical formulas (no
  external ephemeris dependency). Sun sign is highly accurate; Moon sign is
  approximate to roughly ±0.3–0.6°; Ascendant is exact given its inputs but
  very sensitive to birth-time accuracy. **Mercury, Venus, Mars, Jupiter,
  and Saturn are not implemented** — `server/services/astrologyService.js`
  has a `TODO(planets)` comment marking where a full ephemeris implementation
  (e.g. VSOP87, or a library such as `astronomy-engine`) would need to be added.
- **Payments**: only the sandbox gateway is implemented. `server/services/paymentService.js`
  has `TODO(live)` markers for wiring up Stripe/PayPal — the order state
  machine itself doesn't need to change, only the payment-intent/webhook handlers.
- **Integration tests require configuration.** The PostgreSQL suite is skipped
  unless `TEST_DATABASE_URL` is set. The test database is protected by the
  `_test` name requirement and uses an isolated temporary schema.
- **Tarot deck**: 22 Major Arcana are hand-written; the 56 Minor Arcana are
  assembled from a suit-theme × rank-theme table rather than 56 individually
  hand-authored entries (see comments in `server/data/tarotDeck.js` for why —
  this also keeps the interpretations original rather than reproducing any
  single author's copyrighted card-meaning text).
- **PDF export** uses `pdfkit`. Generation is covered by server code paths but
  has not been visually inspected page-by-page in this environment.
- `npm install`, `next build`, local browser rendering, unit tests, Playwright,
  and PostgreSQL integration tests have been run in this environment.

## Report pipeline

Every reading goes through three tiers, free to paid to paid:

1. **Simple report (free)** — click "Generate report" after drawing/casting.
   Written by a deterministic, non-AI algorithm (`server/services/reportService.js`)
   that combines the actual cards/positions or chart points into templated
   prose. No AI call, no cost.
2. **Detailed report (optional payment)** — same algorithm, deeper (card-arc
   synthesis, reversed-card notes, Sun/Moon element combinations). Users can
   skip payment and keep the report with `detail_unpaid`, or submit a QR
   payment for admin verification. The reading becomes `detail_tobepaid`
   while waiting and `detail_paid` only after an admin verifies the order.
   Accessible detailed reports can be exported as a PDF.
3. **Deep Insights report (paid, separate order, requires tier 2 first)** —
   a bespoke AI-written interpretation (`server/services/aiReading.js`).
   Depending on the admin's **AI mechanism** setting, this either generates
   automatically after an admin verifies payment, or lands in the admin
   portal's **Deep Insights Queue** for a human to generate (one click, via
   AI) or write by hand.

Pricing is per-category (tarot / astrology / spreads) and tier, set in
**Admin → Settings → Report pricing** — never hardcoded in the client.

## User accounts

Signed-in users get a dashboard with two tabs: **Readings** (history, linking
into each reading's report pipeline) and **Account settings** (edit
name/email, change password — the server verifies the current password via
bcrypt before allowing a change). The nav shows a user-icon avatar + Logout
button once signed in, replacing the "Sign in" link.

## Admin portal

`/admin/login` → `/admin` (Overview, Users, Orders, Readings, Deep Insights
Queue, Consultations, Content & FAQ, Settings, and — super-admin only —
Admin accounts). Permissions are domain-scoped (`users`, `orders`,
`readings`, `consults`, `settings`, `content`) and enforced both in the API
(`requirePerm`) and hidden from the nav client-side for admins who lack them.

See `docs/PROGRESS.md` for the full batch-by-batch build log.
