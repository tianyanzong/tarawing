# Admin Payments and AI Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-verified QR payments, owner emails in admin lists, and ordered multi-provider AI fallback while keeping payments manual and secrets protected.

**Architecture:** Keep report and provider configuration in the existing JSONB settings row, encrypt API keys with Node's built-in crypto, and keep payment orders in the existing table with new verification states. The reading status is the customer-facing entitlement state; the order status is the admin verification workflow.

**Tech Stack:** Next.js 15, React 18, TypeScript, Express 4, PostgreSQL, Zod, Node built-in test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-admin-payments-ai-providers-design.md`

## Global Constraints

- Do not add npm packages.
- Keep `snake_case` in PostgreSQL and `camelCase` at the API boundary.
- Validate all request bodies with Zod.
- Use parameterized SQL only.
- Do not expose API keys in API responses or audit logs.
- Do not hardcode colors in client components.
- Keep `server/` and `client/` dependencies separate.
- Preserve the untracked `server/test/spreads.test.js`.
- Run verification before every commit.
- Every task must update `README.md` and `docs/PROGRESS.md` and include those
  files in that task's commit.

---

### Task 1: Settings Schema, Secret Storage, and Status Migration

**Files:**
- Create: `server/services/settingsSecurity.js`
- Create: `server/test/settingsSecurity.test.js`
- Modify: `server/db/index.js`
- Modify: `server/schemas/index.js`
- Modify: `server/db/demo-seed-data.js`
- Modify: `server/test/postgres.integration.test.js`

**Interfaces:**
- Produces: `encryptSecret(plain: string): string`
- Produces: `decryptSecret(encrypted: string): string`
- Produces: `sanitizeAiEndpointsForAdmin(endpoints): Array<{ id,name,adapter,model,baseUrl,enabled,order,hasApiKey }>`
- Produces: `mergeAiEndpoints(incoming, existing): Array<Endpoint with apiKeyEncrypted>`
- Produces: `publicSettings(settings): object`
- Produces: `DETAIL_UNPAID`, `DETAIL_TOBEPAID`, `DETAIL_PAID`
- Produces: `detailAccessFromStatus(status): { accessible, paid }`

- [ ] **Step 1: Write failing secret tests**

```js
test('encrypts and decrypts an API key without returning plaintext', () => {
  const encrypted = encryptSecret('sk-test-secret');
  assert.match(encrypted, /^enc:v1:/);
  assert.equal(encrypted.includes('sk-test-secret'), false);
  assert.equal(decryptSecret(encrypted), 'sk-test-secret');
});

test('sanitizes endpoints and preserves existing keys when replacement is blank', () => {
  const existing = [{ id: 'aip_1', name: 'OpenAI', adapter: 'openai', model: 'gpt', enabled: true, order: 0, apiKeyEncrypted: encryptSecret('sk-old') }];
  const merged = mergeAiEndpoints([{ id: 'aip_1', name: 'OpenAI', adapter: 'openai', model: 'gpt-4.1-mini', enabled: true, order: 0 }], existing);
  assert.equal(decryptSecret(merged[0].apiKeyEncrypted), 'sk-old');
  assert.equal(sanitizeAiEndpointsForAdmin(merged)[0].hasApiKey, true);
  assert.equal('apiKeyEncrypted' in sanitizeAiEndpointsForAdmin(merged)[0], false);
});
```

- [ ] **Step 2: Run the tests and confirm the missing-module failure**

Run: `cd server; npm test -- --test-name-pattern="API key|sanitizes endpoints"`

Expected: FAIL because `settingsSecurity.js` or its exports do not exist.

- [ ] **Step 3: Implement encryption and settings helpers**

Use `crypto.createCipheriv('aes-256-gcm', ...)`, a random 12-byte IV, the auth tag, and a versioned `enc:v1:` string. Derive the 32-byte key with SHA-256 from `SETTINGS_ENCRYPTION_KEY || JWT_SECRET`. Reject missing/invalid encrypted values with a generic error. Never log secrets.

- [ ] **Step 4: Update settings schemas and seed defaults**

Add strict AI endpoint and payment method schemas. Accept `apiKey` as an optional plaintext replacement and reject unknown encrypted fields. Allow QR images only as PNG/JPEG/WebP data URLs. Seed `aiMechanism.endpoints` as `[]` and `paymentMethods` as `[]`.

- [ ] **Step 5: Add status migration and integration assertions**

Run idempotent updates after table creation:

```sql
UPDATE readings SET status='detail_paid'
WHERE status='detail_unlocked'
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.reading_id=readings.id
      AND orders.product_code LIKE 'detail_%'
      AND orders.status='paid'
  );

UPDATE readings SET status='detail_unpaid'
WHERE status='detail_unlocked';
```

Update demo statuses and assert the migrated value in `postgres.integration.test.js`.

- [ ] **Step 6: Run focused and server tests**

Run: `cd server; npm test`

Expected: all runnable tests pass; PostgreSQL integration is skipped only when `TEST_DATABASE_URL` is absent.

- [ ] **Step 7: Commit**

```bash
git add server/services/settingsSecurity.js server/test/settingsSecurity.test.js server/db/index.js server/schemas/index.js server/db/demo-seed-data.js server/test/postgres.integration.test.js
git commit -m "feat: secure admin report and payment settings"
```

### Task 2: Provider-Agnostic AI Fallback

**Files:**
- Create: `server/test/aiReading.test.js`
- Modify: `server/services/aiReading.js`
- Modify: `server/services/paymentService.js`

**Interfaces:**
- Produces: `generateAiReading(payload, dependencies?): Promise<{ ok:true,text,providerId,providerName } | { ok:false,error }>`
- Produces: `buildProviderRequest(endpoint, prompt): { url, headers, body }`
- Produces: `extractProviderText(adapter, responseBody): string`
- Produces: `getAiEndpoints(db): Promise<Endpoint[]>`

- [ ] **Step 1: Write fallback tests**

```js
test('falls back to the next enabled provider in configured order', async () => {
  const attempts = [];
  const fetchImpl = async (url) => {
    attempts.push(url);
    if (url.includes('anthropic')) return new Response('nope', { status: 500 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Second provider answer' } }] }), { status: 200 });
  };
  const result = await generateAiReading(
    { type: 'tarot', question: 'Test', cards: [] },
    { fetchImpl, loadEndpoints: async () => [
      { id: 'aip_a', name: 'Anthropic', adapter: 'anthropic', model: 'claude', apiKeyEncrypted: encryptSecret('a'), enabled: true, order: 0 },
      { id: 'aip_b', name: 'OpenAI', adapter: 'openai', model: 'gpt', apiKeyEncrypted: encryptSecret('b'), enabled: true, order: 1 },
    ] },
  );
  assert.equal(result.ok, true);
  assert.equal(result.text, 'Second provider answer');
  assert.equal(result.providerName, 'OpenAI');
  assert.equal(attempts.length, 2);
});
```

Add tests for disabled-endpoint filtering, custom OpenAI-compatible URLs, and a final failure that does not contain either secret.

- [ ] **Step 2: Run the tests and confirm fallback is missing**

Run: `cd server; npm test -- --test-name-pattern="provider"`

Expected: FAIL because provider adapters and dependency injection are absent.

- [ ] **Step 3: Implement provider adapters**

Use the existing request shape for Anthropic. Use bearer auth plus `/chat/completions` for `openai`, `deepseek`, and `openai_compatible`. Default base URLs:

- Anthropic: `https://api.anthropic.com`
- OpenAI: `https://api.openai.com/v1`
- DeepSeek: `https://api.deepseek.com/v1`

Require an HTTPS base URL for `openai_compatible`. Sort enabled endpoints by `order`, decrypt one key at a time, and continue after failures. Return only the final aggregate error.

- [ ] **Step 4: Connect settings loading**

Add `getAiEndpoints(db)` to payment/settings service code. It must read `settings.aiMechanism.endpoints`, normalize the array, and return only enabled entries. `aiReading.js` must not read `ANTHROPIC_API_KEY` or `ANTHROPIC_MODEL`.

- [ ] **Step 5: Run tests**

Run: `cd server; npm test`

Expected: all runnable tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/services/aiReading.js server/services/paymentService.js server/test/aiReading.test.js
git commit -m "feat: add ordered multi-provider AI fallback"
```

### Task 3: Admin Data Joins and Payment Verification API

**Files:**
- Create: `server/services/reportFlowService.js`
- Create: `server/test/reportFlowService.test.js`
- Modify: `server/repositories/lists.js`
- Modify: `server/server.js`
- Modify: `server/test/postgres.integration.test.js`

**Interfaces:**
- Produces: `detailAccessFromStatus(status): { accessible, paid }`
- Produces: `verificationStatusForTier(tier): string`
- Produces: `submitStatusForProduct(productCode): string | null`
- `listAdminOrders` rows add `userEmail`
- `listAdminReadings` rows add `userEmail`
- Admin order verification endpoints

Boolean state rules:

```js
detailAccessFromStatus('new')            // { accessible: false, paid: false }
detailAccessFromStatus('detail_unpaid')  // { accessible: true, paid: false }
detailAccessFromStatus('detail_tobepaid')// { accessible: true, paid: false }
detailAccessFromStatus('detail_paid')    // { accessible: true, paid: true }
```

- [ ] **Step 1: Write failing state tests**

```js
test('Deep Insights requires a verified detail payment', () => {
  assert.equal(canGenerateDeepInsights('detail_unpaid'), false);
  assert.equal(canGenerateDeepInsights('detail_tobepaid'), false);
  assert.equal(canGenerateDeepInsights('detail_paid'), true);
});

test('maps submitted orders to tier-specific verification states', () => {
  assert.equal(verificationStatusForTier('detail'), 'detail_tobepaid');
  assert.equal(verificationStatusForTier('deep_insights'), 'deep_insights_tobepaid');
});
```

- [ ] **Step 2: Run the state tests and confirm failure**

Run: `cd server; npm test -- --test-name-pattern="verified|verification"`

Expected: FAIL because the state service does not exist.

- [ ] **Step 3: Implement state rules**

Implement the small pure service and use it in `buildReadingView`, PDF access, order creation, admin generation, and manual generation. Do not duplicate status string logic in routes.

- [ ] **Step 4: Add joined email queries**

Use aliases and qualified cursor/order fields:

```sql
SELECT o.*, u.email AS user_email
FROM orders o LEFT JOIN users u ON u.id=o.user_id
WHERE o.deleted=false
ORDER BY o.created_at DESC,o.id DESC
```

Apply the same owner join to admin readings and the Deep Insights queue. Add integration assertions for a seeded email.

- [ ] **Step 5: Implement submission and admin verification routes**

`POST /api/orders/:id/submit-payment` accepts `{ paymentMethodId }`, validates an enabled QR method, sets the order channel and submitted status, and updates reading status where applicable.

`POST /api/admin/orders/:id/verify-payment` accepts only submitted statuses, sets the order to paid, sets detail readings to `detail_paid`, and triggers the existing generation behavior after commit.

`POST /api/admin/orders/:id/reject-payment` sets the order to failed and detail readings to `detail_unpaid`.

- [ ] **Step 6: Remove self-confirmation**

Remove the user-callable `simulate-sandbox-pay` route. Do not add a replacement route that trusts a user click as payment verification.

- [ ] **Step 7: Run tests and commit**

Run: `cd server; npm test`

```bash
git add server/services/reportFlowService.js server/test/reportFlowService.test.js server/repositories/lists.js server/server.js server/test/postgres.integration.test.js
git commit -m "feat: add admin payment verification workflow"
```

### Task 4: Admin Settings Tabs and Verification UI

**Files:**
- Modify: `client/app/admin/(dashboard)/settings/page.tsx`
- Modify: `client/app/admin/(dashboard)/orders/page.tsx`
- Modify: `client/app/admin/(dashboard)/readings/page.tsx`
- Modify: `client/app/admin/(dashboard)/deep-insights/page.tsx`
- Modify: `client/lib/types.ts`
- Modify: `client/app/globals.css`
- Modify: `client/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: sanitized `AiEndpoint`, `PaymentMethod`, and submitted order states from earlier tasks.
- Produces: four-tab settings UI.
- Produces: admin verification/rejection actions.

- [ ] **Step 1: Add browser assertions before UI implementation**

Extend the mocked admin settings route and assert:

```ts
await expect(page.getByRole('button', { name: 'General' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Report pricing' })).toBeVisible();
await expect(page.getByRole('button', { name: 'AI mechanism' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Payment methods' })).toBeVisible();
```

Add a fixture order in `detail_tobepaid` and assert its email and "Verify payment" action render.

- [ ] **Step 2: Run the focused browser test and confirm failure**

Run: `cd client; npx playwright test e2e/routes.spec.ts --grep "admin settings|payment verification"`

Expected: FAIL because the tabs and action are absent.

- [ ] **Step 3: Implement AI settings UI**

Add fields for name, adapter, model, base URL, key replacement, enabled, up/down ordering, remove, and add. Show a masked-key status. Use client-side ordering normalization before save.

- [ ] **Step 4: Implement payment-method settings UI**

Add name, enabled checkbox, file input, QR preview, remove, add, and ordering. Convert PNG/JPEG/WebP files up to 1 MiB to data URLs. Provide visible validation errors.

- [ ] **Step 5: Add tabs and admin verification actions**

Use existing `.tab-btn` styles. Keep one Save settings action for the active editable settings state. Add Verify and Reject actions on submitted orders and show user emails on all three admin tables.

- [ ] **Step 6: Run client checks and browser tests**

Run:

```bash
cd client
npx tsc --noEmit
npm test
npx playwright test e2e/routes.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add "client/app/admin/(dashboard)/settings/page.tsx" "client/app/admin/(dashboard)/orders/page.tsx" "client/app/admin/(dashboard)/readings/page.tsx" "client/app/admin/(dashboard)/deep-insights/page.tsx" client/lib/types.ts client/app/globals.css client/e2e/routes.spec.ts
git commit -m "feat: add admin settings and payment verification UI"
```

### Task 5: User QR Payment Dialog and Report Entitlements

**Files:**
- Create: `client/components/PaymentDialog.tsx`
- Modify: `client/components/ReportFlow.tsx`
- Modify: `client/app/(site)/dashboard/page.tsx`
- Modify: `client/lib/types.ts`
- Modify: `client/app/globals.css`
- Modify: `server/server.js`
- Modify: `server/test/reportFlowService.test.js`
- Modify: `client/e2e/routes.spec.ts`

**Interfaces:**
- Consumes: `GET /api/payment-methods`, detail skip/submit endpoints, and submitted order states.
- Produces: `PaymentDialog({ tier, methods, selectedMethodId, onSelect, onSkip, onComplete, busy, error })`
- Produces: `ReadingView.detail: { accessible, paid, status, orderId, orderStatus }`

- [ ] **Step 1: Add failing browser coverage**

Mock a `detail_unpaid` reading and enabled PayPal/Stripe methods. Assert:

- The detail report is visible.
- The Deep Insights button is disabled.
- A detail payment button is visible.
- Opening the dialog shows both QR images.
- "Skip payment" appears only in the detail dialog.

- [ ] **Step 2: Run the focused browser test and confirm failure**

Run: `cd client; npx playwright test e2e/routes.spec.ts --grep "QR payment"`

Expected: FAIL because the dialog and entitlement states are absent.

- [ ] **Step 3: Extend the server reading view and public methods route**

Return detail accessibility, paid state, order status, and public enabled methods. Keep Deep Insights report text gated by its paid order.

- [ ] **Step 4: Implement the dialog and report flow**

Opening the detail action may create/reuse the pending order. Skip calls the skip endpoint. Complete calls submit-payment with the selected method. The Deep Insights action is enabled only for `detail.paid` and its dialog has no skip control.

- [ ] **Step 5: Update dashboard status presentation**

Show the three detail statuses distinctly and keep the existing View link as the continuation point.

- [ ] **Step 6: Run all relevant checks**

Run:

```bash
cd server
npm test
cd ..\client
npx tsc --noEmit
npm test
npx playwright test e2e/routes.spec.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/components/PaymentDialog.tsx client/components/ReportFlow.tsx "client/app/(site)/dashboard/page.tsx" client/lib/types.ts client/app/globals.css server/server.js server/test/reportFlowService.test.js client/e2e/routes.spec.ts
git commit -m "feat: add admin-verified QR report payments"
```

### Task 6: Environment Cleanup, Documentation, and Release Verification

**Files:**
- Modify: `server/.env.example`
- Modify: `server/.env`
- Modify: `README.md`
- Modify: `docs/PROGRESS.md`
- Modify: `docs/ARCHITECTURE_REVIEW.md`

**Interfaces:**
- Removes `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`.
- Documents `SETTINGS_ENCRYPTION_KEY` and DB-managed provider configuration.

- [ ] **Step 1: Remove Anthropic environment entries**

Remove both entries from tracked examples, local env files, README tables,
deployment examples, and remaining source comments/docs. Confirm through:

```powershell
rg -n "ANTHROPIC_API_KEY|ANTHROPIC_MODEL" -g '!node_modules'
```

Expected: no output.

- [ ] **Step 2: Document the operational flow**

Update setup, known limitations, admin settings, AI providers, and manual QR
verification. State explicitly that no automatic bank verification exists and
that an admin must verify payments.

- [ ] **Step 3: Run the full release gate**

Run:

```bash
cd server
npm run build
npm test
cd ..\client
npx tsc --noEmit
npm test
npm run build
```

Run Playwright separately:

```bash
cd client
npx playwright test
```

Expected: every command exits 0. If an environment-only test is skipped,
report the exact skip reason.

- [ ] **Step 4: Inspect the final diff**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: no whitespace errors and no unintended files staged.

- [ ] **Step 5: Commit**

```bash
git add server/.env.example server/.env README.md docs/PROGRESS.md docs/ARCHITECTURE_REVIEW.md
git commit -m "docs: document payment verification and AI providers"
```

## Self-Review

- Every approved requirement maps to Tasks 1-6.
- Status semantics match: skip is `detail_unpaid`; submit is
  `detail_tobepaid`; admin verification is `detail_paid`.
- Admin verification is required before any paid entitlement.
- Deep Insights generation is blocked until an admin-paid order exists.
- AI providers are ordered and provider-agnostic through adapter selection.
- API keys never return to the browser or enter audit logs.
- No dependency additions are planned.
