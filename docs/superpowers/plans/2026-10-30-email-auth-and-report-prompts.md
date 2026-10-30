# Email Authentication and Detailed Report Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add database-managed SMTP, password reset, configurable email verification, and question-specific detailed reports with admin-only AI prompts.

**Architecture:** Store SMTP secrets in the encrypted settings JSON, use one-time hashed auth tokens, and keep email verification policy in General settings. Enrich the deterministic report service and store a generated admin-only prompt beside each detailed report.

**Tech Stack:** Next.js 15, React 18, TypeScript, Express 4, PostgreSQL, Zod, Nodemailer, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-email-auth-and-report-prompts-design.md`

## Global Constraints

- Add only the approved `nodemailer` dependency in `server/`.
- Keep SMTP and auth tokens out of client-facing settings/readings responses.
- Store only hashed auth tokens.
- Default `requireEmailVerification` to false.
- Backfill existing users as verified exactly once.
- Update `README.md` and `docs/PROGRESS.md` in every batch.
- Preserve the untracked `server/test/spreads.test.js`.
- Run verification before every commit.

---

### Task 1: Schema, SMTP Settings, Token Helpers

**Files:**
- Modify: `server/db/index.js`
- Modify: `server/db/demo-seed-data.js`
- Modify: `server/schemas/index.js`
- Modify: `server/services/settingsSecurity.js`
- Modify: `server/test/settingsSecurity.test.js`
- Modify: `server/test/settingsSchema.test.js`
- Modify: `server/test/postgres.integration.test.js`
- Create: `server/services/authTokenService.js`
- Create: `server/test/authTokenService.test.js`

**Interfaces:**
- Produces: `mergeSmtpSettings(incoming, existing): object`
- Produces: `sanitizeSmtpForAdmin(smtp): object`
- Produces: `createAuthToken(database, userId, purpose): Promise<string>`
- Produces: `consumeAuthToken(database, token, purpose): Promise<user | null>`
- Produces: SMTP and verification settings defaults

- [ ] Write failing tests for SMTP password preservation/redaction and hashed one-time tokens.
- [ ] Run the focused tests and confirm missing APIs fail.
- [ ] Add the migration marker, user verification column, `auth_tokens` table, and `readings.ai_prompt`.
- [ ] Add validated SMTP and `requireEmailVerification` settings.
- [ ] Add encrypted SMTP password merge/redaction and audit redaction.
- [ ] Add auth-token hashing, expiry, invalidation, and consumption.
- [ ] Run focused tests, full server tests, and server build.
- [ ] Update README/PROGRESS and commit.

### Task 2: Mail Service and Auth Email Routes

**Files:**
- Create: `server/services/mailService.js`
- Create: `server/test/mailService.test.js`
- Modify: `server/schemas/index.js`
- Modify: `server/server.js`
- Modify: `server/test/postgres.integration.test.js`

**Interfaces:**
- Produces: `sendPasswordResetEmail(settings, to, token): Promise<void>`
- Produces: `sendVerificationEmail(settings, to, token): Promise<void>`
- Produces: `sendTestEmail(settings, to): Promise<void>`
- Produces: forgot/reset/verify/resend/test-email routes

- [ ] Write failing mail-template tests for links, recipient, and escaped HTML.
- [ ] Implement Nodemailer transport from sanitized SMTP settings.
- [ ] Add forgot-password, reset-password, verify-email, and resend routes.
- [ ] Add login verification gate and registration verification email.
- [ ] Add admin SMTP test route.
- [ ] Run server tests and integration tests, update docs, and commit.

### Task 3: SMTP Settings and User Auth UI

**Files:**
- Modify: `client/app/admin/(dashboard)/settings/page.tsx`
- Modify: `client/app/(site)/login/page.tsx`
- Create: `client/app/(site)/forgot-password/page.tsx`
- Create: `client/app/(site)/reset-password/page.tsx`
- Create: `client/app/(site)/verify-email/page.tsx`
- Modify: `client/lib/types.ts`
- Modify: `client/app/globals.css`
- Modify: `client/e2e/routes.spec.ts`

**Interfaces:**
- Consumes auth routes from Task 2.
- Produces SMTP tab, verification checkbox, recovery pages, resend action.

- [ ] Add failing browser tests for the SMTP tab, forgot link, reset form, and verification page.
- [ ] Add General verification checkbox and SMTP tab.
- [ ] Add password-reset and verification pages with Suspense query handling.
- [ ] Add login resend action for mandatory verification errors.
- [ ] Run TypeScript, unit tests, build, Playwright; update docs and commit.

### Task 4: Question-Specific Detailed Reports and Admin AI Prompt

**Files:**
- Modify: `server/services/reportService.js`
- Create: `server/test/reportService.test.js`
- Modify: `server/services/aiReading.js`
- Modify: `server/server.js`
- Modify: `client/app/admin/(dashboard)/readings/page.tsx`
- Modify: `client/lib/types.ts`
- Modify: `client/e2e/routes.spec.ts`

**Interfaces:**
- Produces: `generateDetailedReportBundle(reading): { detailedReport, aiPrompt }`
- Extends AI payload with explicit `prompt?: string`
- Admin detail returns `aiPrompt`; user reading views never return it.

- [ ] Write failing report tests for structured sections, question intent, and prompt content.
- [ ] Implement deterministic report sections and prompt generation.
- [ ] Store prompt wherever detailed reports are generated; lazily backfill admin views.
- [ ] Use saved prompts for automatic and admin-triggered AI generation.
- [ ] Add admin prompt display/copy and browser coverage.
- [ ] Run all checks, update docs, and commit.

### Task 5: Final Documentation and Release Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/ARCHITECTURE_REVIEW.md` if SMTP/auth boundaries affect its guidance

- [ ] Run server integration tests with `TEST_DATABASE_URL`.
- [ ] Run root build and full Playwright suite.
- [ ] Confirm no SMTP password or auth token appears in public responses/logs.
- [ ] Confirm desktop/mobile settings and auth pages have no horizontal overflow.
- [ ] Update docs/progress and commit.

## Self-Review

- Each user requirement maps to a task.
- Existing users are protected from lockout.
- Default verification policy is non-blocking.
- AI prompts are admin-only and used by generation.
- No unapproved dependency is introduced.
