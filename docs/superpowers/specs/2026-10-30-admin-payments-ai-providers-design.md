# Admin Payments and AI Providers Design

Date: 2026-10-30

## Goal

Add admin-managed QR payment methods, admin-verified report payments, and
ordered multi-provider AI generation to Tarawing without introducing new npm
dependencies or misrepresenting the QR flow as a live payment gateway.

## Report and Order States

Detailed reports use these reading states:

- `new`: no detail report has been generated or paid for yet.
- `detail_unpaid`: the user clicked "Skip payment"; the detailed report is
  viewable, but Deep Insights remains locked.
- `detail_tobepaid`: the user clicked "Complete payment" in the QR payment
  dialog; the order is waiting for an admin to verify the incoming payment.
- `detail_paid`: an admin verified the detail payment; Deep Insights is enabled.

Order states use the existing `pending` state plus:

- `detail_tobepaid`: a detail payment is waiting for admin verification.
- `deep_insights_tobepaid`: a Deep Insights payment is waiting for admin
  verification.
- `paid`: an admin verified the payment.
- `failed`: an admin rejected the submitted payment.

The existing `detail_unlocked` reading value is migrated during schema startup:
paid detail orders become `detail_paid`; all other rows become
`detail_unpaid`.

## Report Flow

### Detailed Report

1. A signed-in user opens the payment dialog from the detailed-report action.
2. The dialog lists enabled QR payment methods.
3. "Skip payment" generates the detailed report and sets the reading to
   `detail_unpaid`.
4. "Complete payment" records the selected method, generates the detailed
   report if needed, and sets the reading to `detail_tobepaid`.
5. Only an admin can verify the submitted order. Verification sets the order to
   `paid` and the reading to `detail_paid`.
6. A rejected payment sets the order to `failed` and a detail reading back to
   `detail_unpaid`.

The user can continue payment from the reading page while the reading is
`detail_unpaid`.

### Deep Insights Report

1. The Deep Insights action is visible but disabled unless the reading is
   `detail_paid`.
2. Deep Insights has no skip option.
3. "Complete payment" creates or reuses an order and sets it to
   `deep_insights_tobepaid`.
4. Only an admin can verify the order and set it to `paid`.
5. AI or manual generation is rejected server-side until a paid Deep Insights
   order exists.
6. After verification, automatic generation runs only when
   `aiMechanism.autoGenerateOnPayment` is enabled; otherwise the paid order
   enters the admin Deep Insights Queue.

## Settings Model

Configuration remains in the single `settings` JSONB row under `site`.

### AI Mechanism

```json
{
  "autoGenerateOnPayment": true,
  "endpoints": [
    {
      "id": "aip_...",
      "name": "Primary OpenAI",
      "adapter": "openai",
      "model": "gpt-4.1-mini",
      "baseUrl": "https://api.openai.com/v1",
      "apiKeyEncrypted": "enc:v1:...",
      "enabled": true,
      "order": 0
    }
  ]
}
```

Supported adapters:

- `anthropic`: Anthropic Messages API.
- `openai`: OpenAI chat completions.
- `deepseek`: DeepSeek's OpenAI-compatible chat completions API.
- `openai_compatible`: another provider using an OpenAI-compatible chat
  completions API and an admin-supplied HTTPS base URL.

The human-readable `name` identifies the provider or account. The `adapter`
selects the request and response format.

Generation tries enabled endpoints sorted by `order`. It falls back after a
network error, non-2xx response, malformed response, or empty text. Errors must
not expose API keys. If all endpoints fail, the existing graceful pending/queue
behavior remains.

API keys are encrypted at rest with AES-256-GCM. The encryption key is derived
from `SETTINGS_ENCRYPTION_KEY`, falling back to the already-required
`JWT_SECRET`. Admin GET responses return `hasApiKey` rather than the secret.
Blank key fields preserve the existing encrypted value; a supplied key replaces
it. Audit logs never contain plaintext or encrypted API keys.

### Payment Methods

```json
{
  "paymentMethods": [
    {
      "id": "pm_...",
      "name": "PayPal",
      "enabled": true,
      "qrImage": "data:image/png;base64,...",
      "order": 0
    }
  ]
}
```

Only PNG, JPEG, and WebP data images are accepted. Each image is limited to
1 MiB before base64 encoding. Admins can add, remove, edit, enable/disable, and
reorder methods. Only enabled methods with an image are exposed publicly.

## API Changes

- `GET /api/admin/orders`: include `userEmail`, including the verification
  states.
- `GET /api/admin/readings`: include `userEmail`.
- `GET /api/admin/readings/:id`: include `userEmail`.
- `GET /api/admin/deep-insights-queue`: include `userEmail`.
- `GET /api/admin/settings`: return sanitized AI configuration.
- `PUT /api/admin/settings`: preserve existing secrets unless replacement keys
  are supplied.
- `GET /api/payment-methods`: return enabled public QR methods only.
- `GET /api/readings/:id`: include detail payment state and Deep Insights order
  state.
- `POST /api/readings/:id/detail/skip-payment`: generate/access the detail
  report and set `detail_unpaid`.
- `POST /api/orders`: create or reuse the current pending order.
- `POST /api/orders/:id/submit-payment`: record the selected QR method and set
  the tier-specific verification state.
- `POST /api/admin/orders/:id/verify-payment`: verify a submitted payment.
- `POST /api/admin/orders/:id/reject-payment`: reject a submitted payment.
- Remove the user-callable `simulate-sandbox-pay` route so users cannot mark
  their own orders paid.

## Admin UI

Settings has four tabs:

1. General
2. Report pricing
3. AI mechanism
4. Payment methods

The AI tab manages provider entries and ordering. The Payment methods tab
manages QR methods and ordering. Admin Orders shows user email and verification
actions for submitted payments. Orders, Readings, and Deep Insights Queue show
the owning user's email.

## User UI

The reading page shows a modal QR payment dialog. It lists enabled payment
methods, allows one to be selected, and displays the corresponding QR image.

- Detail dialog: "Skip payment" and "Complete payment".
- Deep Insights dialog: "Complete payment" only.
- While a payment awaits verification, the reading page explains that admin
  verification is required.
- The Deep Insights button remains visible but disabled until `detail_paid`.

No colors are hardcoded in client components; styling uses the existing CSS
variables and shared classes.

## Error Handling and Security

- Validate every settings and order payload with Zod.
- Keep SQL parameterized.
- Never return stored AI API keys or include them in audit logs.
- Allow only `https:` URLs for custom AI base URLs.
- Allow only image data URLs for QR images.
- Keep QR payments explicitly manual and admin-verified; this is not a live
  gateway integration.
- Do not generate Deep Insights from admin or automatic paths without a paid
  Deep Insights order.

## Testing

- Unit tests for API-key encryption, masking, preservation, and public settings
  sanitization.
- Unit tests for provider adapter selection, ordering, fallback, and error
  redaction.
- Unit tests for report/order state transition rules.
- PostgreSQL integration coverage for status migration and joined user emails
  when `TEST_DATABASE_URL` is available.
- Client type-check and production build.
- Existing server, card-art, and Playwright tests.
- Focused browser coverage for admin settings tabs and the QR payment dialog.

## Out of Scope

- Automatic bank or QR transaction verification.
- Storing card details.
- Uploading QR files to object storage.
- A framework, ORM, file-upload package, or payment-provider SDK.

