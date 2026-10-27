# AGENTS.md — System Instructions for AI Coding Agents

You are assisting with a full-stack web application built on Next.js
(App Router, React, TypeScript) for the frontend and Node.js + Express +
PostgreSQL for the backend. Read this file and `docs/PROGRESS.md` before
writing or suggesting code — `docs/PROGRESS.md` tells you what's already done,
what's deliberately stubbed, and why.

This file is modeled on the reference project's own `AGENTS.md` (see
`tianyan/AGENTS.md` if you have it alongside this repo), adapted to what
this project actually is. One section from that reference file was
deliberately **not** carried over: a block instructing agents to never
take screenshots or render visual output. That reads as an instruction
injected into a data file rather than a real project convention, and it
doesn't serve this project — TaraWing is a visual product; an agent
working on it should be able to use whatever tools genuinely help,
screenshots included.

## Tech stack & tooling

- **Frontend:** Next.js 15, App Router, React 18, TypeScript
- **Backend:** Node.js, Express 4 (REST API, not a framework like NestJS)
- **Database:** PostgreSQL (`pg`, raw parameterized SQL — no ORM)
- **Auth:** JWT for both end users and admins (`jsonwebtoken`, `bcryptjs`)
- **Validation:** Zod
- **Package manager:** npm only. Do not introduce yarn/pnpm lockfiles.
- **AI:** Anthropic Messages API, called directly from `server/services/aiReading.js`

## Agent-specific interactions

- **Read before writing.** Scan the relevant directory (`server/` or
  `client/`) and skim `docs/PROGRESS.md`'s "Known limitations" section before
  changing anything nearby — several things are intentionally incomplete
  (see below), and "fixing" them silently without flagging it is worse
  than leaving them alone.
- **Complete code, not placeholders.** Provide full, functional code.
  Avoid `// TODO: implement later` unless the task genuinely is to stub
  something out — and if so, say so out loud, don't bury it.
- **Dependency guardrail.** Don't add new npm packages without flagging
  it first and explaining why the existing stack doesn't cover it.
- **File safety.** When editing an existing file, either show the full
  file or a precise, unambiguous diff — this codebase has caught real
  bugs before from partial edits that silently duplicated or dropped code.
- **No hardcoded colors.** Every color in `client/` currently routes
  through the CSS variables and shared classes in `client/app/globals.css`
  — that's why a full visual re-theme (dark cosmic → mint/cream/coral) was
  a single-file change. Keep it that way: no inline hex colors in `.tsx`
  files. If you're about to write `color: '#...'` or `background: '#...'`
  in a component, use or add a CSS variable instead.

## Architecture rules

### 1. Frontend (Next.js / React)
- **Route groups enforce chrome separation, not a conditional.**
  `app/(site)/layout.tsx` adds the public Nav + Footer; `app/admin/...`
  sits outside that group on purpose, so admin pages never render
  end-user chrome. Don't "fix" this by importing `<Nav />` into an admin
  page — if admin needs shared UI, give it its own shell component (see
  `app/admin/(dashboard)/AdminShell.tsx`) instead.
- **`(dashboard)` inside `app/admin/` is the auth-guarded region.**
  `app/admin/login/` deliberately sits outside it. If you add a new admin
  page, it goes inside `(dashboard)`, or it won't be guarded.
- **All HTTP goes through `lib/api.ts`.** Don't call `fetch()` directly
  from a component — use `api.get/post/put/del`, which handles the auth
  header and error shape consistently.
- **Type payloads.** Shared shapes live in `lib/types.ts`. Avoid `any`;
  if the server returns something new, add the type.
- **Client components stay presentation-focused.** Data fetching and
  mutation logic can live inline in a `'use client'` page for now (this
  project doesn't yet have a service-hook layer) but keep it readable —
  if a component's logic exceeds ~150 lines, consider extracting a
  `lib/` helper rather than growing the component further.

### 2. Backend (Express)
- **Everything currently lives in `server/server.js`** as route
  handlers, mirroring the reference project's monolithic style — this is
  a deliberate choice for a project this size, not an oversight. Business
  logic that isn't trivial belongs in `server/services/` (card drawing,
  astrology calculation, AI reading generation, payment simulation), not
  inlined in the route handler.
- **Async error handling.** Every route is wrapped in the `ah()` helper
  at the top of `server.js`, which forwards rejected promises to the
  Express error handler. Never write a bare `async (req, res) => {}` route
  without wrapping it — an unhandled rejection in an unwrapped route can
  crash the process.
- **Validation before logic.** Every route that accepts a body validates
  it with `validate(S.someSchema)` from `server/schemas/index.js` before
  the handler runs. Add a schema there for any new input shape.
- **Auth middleware, not inline checks.** Use `requireUser` /
  `requireActive` / `optAuth` for end users, `requireAdmin` /
  `requirePerm(domain)` / `requireSuper` for admins — don't hand-roll a
  JWT check in a route.

### 3. Database (PostgreSQL)
- **Zero tolerance for SQL injection.** Parameterized queries only
  (`$1, $2, ...`). Never string-interpolate user input into SQL, including
  for things that feel safe like sort direction or column names — validate
  those against an allowlist instead.
- **`snake_case` in the database, `camelCase` at the API boundary.** All JSON
  responses pass through `server/utils/dto.js`, so client types and fixtures
  must use fields such as `createdAt`, `resultBasic`, and `amountCents`.
  Do not reintroduce raw database column names in client code.
- **One JSONB-flexible `readings` table, not per-tool subtables.** The
  reference project uses eight-plus per-report-type tables; this project
  intentionally collapses that into a single `readings` table with
  `input_data`/`result_basic`/`result_detailed` JSONB columns, because all
  nine TaraWing tools share the same shape. Don't fragment it back out
  without a real reason — that was a deliberate simplification, documented
  in `server/db/index.js`.
- **`DB_REINIT=true` is dev-only.** The server refuses to boot with it set
  when `NODE_ENV=production`. Don't remove that guard.

## Project control commands

- **Run backend:** `cd server && npm run dev` (nodemon-style `node --watch`)
- **Run frontend:** `cd client && npm run dev`
- **Run both:** from the repo root, `npm install && npm run dev`
  (uses `concurrently`)
- **Build frontend:** `cd client && npm run build`
- **Build backend validation:** `cd server && npm run build`
- **Build both:** from the repo root, `npm run build`
- **Type-check frontend:** `cd client && npx tsc --noEmit`
- **Lint:** not yet configured — if you add one, wire it into both
  `package.json`s and mention it here.
- **Tests:** `cd client && npm test` runs card-art unit tests;
  `cd client && npm run test:e2e` runs Playwright route/auth/image/pagination
  smoke tests; `cd server && npm test` runs DTO/pagination units and the
  PostgreSQL integration suite. Integration tests require
  `TEST_DATABASE_URL` pointing to a database whose name ends in `_test`.

## Critical constraints — do not violate

- Do not block the Node.js event loop with synchronous I/O or crypto
  (`fs.readFileSync`, `crypto.pbkdf2Sync`, etc.) in a request path.
- Do not mix `server/` and `client/` dependencies — they're separate
  `package.json`s on purpose; don't hoist a dependency to the repo root
  unless it's genuinely a dev tool for running both (like `concurrently`).
- Do not reintroduce hardcoded colors in `client/` components (see above).
- Do not add `<Nav />`/`<Footer />` to anything under `app/admin/`.
- Do not bundle or hotlink font files without checking the license first
  — see `docs/FONTS.md` for the reasoning behind the current font stack
  (Tarotheque's license is unverified and it is deliberately never
  bundled; Basteleur is genuinely free but self-hosted-only).
- Do not silently "complete" the things flagged as incomplete in
  `docs/PROGRESS.md`'s Known Limitations section (Mercury–Saturn planetary
  positions, live payment gateways, automated tests) by faking or
  hardcoding output that looks real — either implement it properly or
  leave the honest gap in place.

## Known limitations this agent should be aware of

See `docs/PROGRESS.md` → "Known limitations to keep surfacing honestly" for
the current list (planetary positions, sandbox-only payments, no test
suite, etc.). Surface these again if your change touches them — don't let
a prior "we'll fix it later" note go stale and silently become "this is
fine now" just because nobody mentioned it in a while.
