# Email Authentication and Detailed Report Prompts Design

Date: 2026-10-30

## Goal

Add admin-managed SMTP, password recovery, configurable email verification,
and richer question-specific detailed reports with an admin-only AI prompt.

## Dependencies

Add `nodemailer` to `server/package.json` only. Node's built-in networking is
not a responsible SMTP implementation for authentication, TLS, MIME encoding,
or provider compatibility.

## Data Model

### Users

Add `email_verified_at TEXT` to `users`.

- Existing users are backfilled once through a `schema_migrations` marker.
- New registrations have `email_verified_at = NULL`.
- Demo users are explicitly marked verified.

### Authentication Tokens

Create `auth_tokens`:

```text
id, user_id, token_hash, purpose, expires_at, used_at, created_at
```

Purposes are `password_reset` and `email_verification`. Only SHA-256 token
hashes are stored. Tokens expire after 30 minutes and are single-use.

### Readings

Add nullable `ai_prompt TEXT`. It is generated with new detailed reports and
is never included in public or owner-facing reading responses. Admin reading
detail may return and edit/use it.

### Settings

General settings add:

```json
{ "requireEmailVerification": false }
```

SMTP settings add:

```json
{
  "enabled": false,
  "host": "",
  "port": 587,
  "secure": false,
  "username": "",
  "passwordEncrypted": "",
  "fromName": "Tarawing",
  "fromEmail": "",
  "replyTo": "",
  "publicSiteUrl": "http://localhost:3300"
}
```

The SMTP password uses the existing AES-256-GCM settings-secret helper. Admin
responses expose `hasPassword`, never `passwordEncrypted` or plaintext.
Audit logs redact the password completely.

## Auth and Email Flows

### Registration

Registration always succeeds even when SMTP is unavailable. If SMTP is
enabled, a verification email is sent after account creation. When
`requireEmailVerification` is false, registration still signs the user in.
When true, the account remains unverified and login is blocked until the
verification link is completed.

### Login

If email verification is mandatory and the account has no
`email_verified_at`, login returns 403 with
`details.code = "EMAIL_NOT_VERIFIED"`. The login page offers a resend action.

### Forgot/Reset Password

- `POST /api/auth/forgot-password`: always returns a generic success response
  to prevent email enumeration.
- If the account exists and SMTP is configured, invalidate previous reset
  tokens, create a 30-minute token, and email a link.
- `POST /api/auth/reset-password`: validates token hash and expiry, updates the
  bcrypt password hash, and marks the token used.

### Email Verification

- `POST /api/auth/verify-email`: validates token hash and expiry and sets
  `email_verified_at`.
- `POST /api/auth/resend-verification`: always returns a generic response;
  sends a new verification token when appropriate.

### Mail Service

Use `nodemailer` with SMTP settings from the database. Message templates cover
password reset and verification. Escape user-controlled values in HTML email.
All URLs come from the admin-configured `publicSiteUrl`.

`POST /api/admin/settings/smtp/test` sends a test email to an admin-supplied
address and returns a clear configuration error when SMTP is incomplete.

## Admin UI

Settings gains an SMTP tab with:

- Enabled
- Host, port, secure TLS
- Username and password replacement
- From name, from email, reply-to
- Public site URL
- Test recipient and Send test email

General gains the `Require email verification` checkbox, default off.

## User UI

- Login gains a Forgot password link.
- `/forgot-password` requests a reset email.
- `/reset-password?token=...` sets a new password.
- `/verify-email?token=...` verifies the address.
- Unverified mandatory-login errors offer resend verification.

All states are explicit; the UI must not reveal whether an email exists.

## Detailed Report Algorithm

Replace the short deeper report with a structured, question-aware document:

- Direct response to the exact user question
- Central pattern across the draw/chart
- Card/position or chart-point analysis
- Practical guidance tied to the question
- Seven-day action plan
- Reflection questions
- Clear non-certainty and medical/legal/financial disclaimer

Use deterministic question-intent detection for relationship, career/work,
decisions, transitions, wellbeing, and general guidance. The algorithm remains
non-AI and deterministic.

`generateDetailedReportBundle(reading)` returns:

```js
{
  detailedReport: string,
  aiPrompt: string
}
```

The AI prompt includes the user's question, draw/chart, full detailed report,
desired Deep Insights structure, tone, length, and safety constraints.

The existing AI provider pipeline accepts an explicit prompt. Automatic and
admin-triggered generation use the saved `ai_prompt` when available. Admin
Readings displays it in a read-only prompt block with a Copy prompt action and
uses it for Generate via AI.

## Testing

- SMTP settings schema, encryption, preservation, redaction, and public hiding
- Mail service configuration, message correctness, and escaped HTML
- Token creation, expiry, single use, and hashed-at-rest storage
- Forgot/reset and verification route behavior
- Mandatory verification gate on login
- Detailed report structure, question-intent targeting, and prompt contents
- Admin-only prompt exposure, AI generation using the saved prompt
- Full server tests/build and client unit/type/build/Playwright suite

## Out of Scope

- Third-party transactional email APIs
- Automatic SMTP validation without sending a test message
- Invalidating existing stateless JWT sessions after password reset
- Mandatory verification for existing accounts when the setting is enabled

