import { expect, test, type Page } from '@playwright/test';

const USER = {
  id: 'usr_preview',
  name: 'Preview Reader',
  email: 'preview@tarawing.app',
  role: 'normal',
  createdAt: '2026-10-26T10:00:00.000Z',
};

const ADMIN = {
  id: 'adm_preview',
  username: 'preview-admin',
  role: 'super',
  permissions: [],
  isSuper: true,
};

const ADMIN_SETTINGS = {
  siteName: 'Tarawing',
  tagline: 'Read the Cosmos. Find Your Path.',
  donationEnabled: true,
  donationMessage: 'Support Tarawing',
  supportEmail: 'support@tarawing.app',
  requireEmailVerification: false,
  pricing: {
    tarot: { detail: 299, deepInsights: 499 },
    astrology: { detail: 599, deepInsights: 999 },
    spreads: { detail: 399, deepInsights: 599 },
  },
  aiMechanism: {
    autoGenerateOnPayment: true,
    endpoints: [{
      id: 'aip_preview',
      name: 'OpenAI primary',
      adapter: 'openai',
      model: 'gpt-4.1-mini',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
      order: 0,
      hasApiKey: true,
    }],
  },
  paymentMethods: [{
    id: 'pm_paypal',
    name: 'PayPal',
    enabled: true,
    qrImage: 'data:image/png;base64,iVBORw0KGgo=',
    order: 0,
  }],
  smtp: {
    enabled: true,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: 'mailer',
    fromName: 'Tarawing',
    fromEmail: 'hello@tarawing.app',
    replyTo: 'support@tarawing.app',
    publicSiteUrl: 'http://localhost:3300',
    hasPassword: true,
  },
};

const READING = {
  id: 'rd_preview',
  type: 'tarot',
  category: 'tarot',
  question: 'What should I notice?',
  status: 'new',
  resultBasic: { deck: 'tarot', cards: [] },
  deepInsightsReport: null,
  createdAt: '2026-10-26T10:00:00.000Z',
};

async function useUserSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('tarawing_token', 'preview-user-token');
  });
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: USER }),
  }));
  await page.route(/\/api\/readings(?:\?.*)?$/, (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          items: cursor
            ? [{ ...READING, id: 'rd_preview_2', question: 'Second page reading' }]
            : [READING],
          nextCursor: cursor ? null : 'reading-page-2',
        },
      }),
    });
  });
}

async function useAdminSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('tarawing_admin_token', 'preview-admin-token');
  });
  await page.route('**/api/admin/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: ADMIN }),
  }));
  await page.route(/\/api\/admin\/users(?:\?.*)?$/, (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          items: [{
            id: cursor ? 'usr_preview_2' : 'usr_preview',
            name: cursor ? 'Second Page Reader' : 'Preview Reader',
            email: cursor ? 'second@tarawing.app' : 'preview@tarawing.app',
            role: 'normal',
            lastActive: null,
            createdAt: '2026-10-26T10:00:00.000Z',
          }],
          nextCursor: cursor ? null : 'users-page-2',
        },
      }),
    });
  });
  await page.route(/\/api\/admin\/orders(?:\?.*)?$/, (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          items: [{
            id: cursor ? 'ord_preview_2' : 'ord_preview',
            userId: USER.id,
            userEmail: USER.email,
            productCode: cursor ? 'detail_spreads' : 'detail_tarot',
            amountCents: cursor ? 399 : 299,
            currency: 'USD',
            channel: 'qr:pm_paypal',
            status: cursor ? 'detail_tobepaid' : 'detail_tobepaid',
            paidAt: null,
            createdAt: '2026-10-26T10:00:00.000Z',
          }],
          nextCursor: cursor ? null : 'orders-page-2',
        },
      }),
    });
  });
  await page.route(/\/api\/admin\/readings(?:\?.*)?$/, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: { items: [READING], nextCursor: null },
    }),
  }));
  await page.route('**/api/admin/readings/rd_preview', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        ...READING,
        userId: USER.id,
        simpleReport: null,
        detailedReport: null,
        deepInsightsReport: null,
        aiPrompt: 'Use this admin-only prompt to generate a deeper reading.',
        adminNotes: null,
      },
    }),
  }));
  await page.route('**/api/admin/settings', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: ADMIN_SETTINGS }),
  }));
}

test('query-param routes prerender and expose their page controls', async ({ page }) => {
  const routes = [
    { path: '/tarot?deck=playing_cards', heading: 'Draw a card' },
    { path: '/spreads?type=lenormand_pair', heading: 'The Sacred Layout Engine' },
    { path: '/spreads?type=gypsy_cross', heading: 'The Sacred Layout Engine' },
    { path: '/astrology?mode=seven_planets', heading: 'Astrology' },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { name: route.heading, level: 1 })).toBeVisible();
  }

  await useAdminSession(page);
  await page.goto('/admin/readings?id=rd_preview');
  await expect(page.getByRole('heading', { name: 'Readings', level: 1 })).toBeVisible();
  await expect(page.getByLabel('AI generation prompt')).toHaveValue(/admin-only prompt/);
});

test('user auth provider restores the session without the dashboard circular logo', async ({ page }) => {
  await useUserSession(page);
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Your dashboard', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Your dashboard' })).toBeVisible();

  await expect(page.locator('img.brand-logo--circular')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load more readings' }).click();
  await expect(page.getByText('Second page reading')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('tarawing_token'))).toBeNull();
});

test('login and register use the same original form width without demo credentials', async ({ page }) => {
  await page.goto('/login');
  const loginForm = page.locator('.auth-form');
  await expect(loginForm).toBeVisible();
  await expect(page.getByText(/Demo account:/)).toHaveCount(0);
  const loginWidth = await loginForm.evaluate((element) => element.getBoundingClientRect().width);

  await page.goto('/register');
  const registerForm = page.locator('.auth-form');
  await expect(registerForm).toBeVisible();
  const registerWidth = await registerForm.evaluate((element) => element.getBoundingClientRect().width);

  expect(loginWidth).toBe(420);
  expect(registerWidth).toBe(loginWidth);
});

test('admin auth provider renders the square logo and clears the admin session on logout', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await useAdminSession(page);
  await page.goto('/admin/users');

  await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
  const logo = page.locator('img.brand-logo--square');
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Load more users' }).click();
  await expect(page.getByText('Second Page Reader')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('tarawing_admin_token'))).toBeNull();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(pageErrors).toEqual([]);
});

test('admin orders append the next cursor page', async ({ page }) => {
  await useAdminSession(page);
  await page.goto('/admin/orders');

  await expect(page.getByText('detail_tarot')).toBeVisible();
  await page.getByRole('button', { name: 'Load more orders' }).click();
  await expect(page.getByText('detail_spreads')).toBeVisible();
});

test('admin settings exposes general, pricing, AI, payment, and SMTP tabs', async ({ page }) => {
  await useAdminSession(page);
  await page.goto('/admin/settings');

  await expect(page.getByRole('button', { name: 'General', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Report pricing', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI mechanism', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Payment methods', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'SMTP', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'AI mechanism', exact: true }).click();
  await expect(page.getByText('OpenAI primary', { exact: true })).toBeVisible();
  await expect(page.getByLabel('API key replacement for OpenAI primary')).toHaveAttribute('placeholder', /configured/i);

  await page.getByRole('button', { name: 'Payment methods', exact: true }).click();
  await expect(page.getByText('PayPal')).toBeVisible();
  await expect(page.getByAltText('PayPal QR code')).toBeVisible();

  await page.getByRole('button', { name: 'SMTP', exact: true }).click();
  await expect(page.getByLabel('SMTP host')).toHaveValue('smtp.example.com');
  await expect(page.getByLabel('SMTP password')).toHaveAttribute('placeholder', /configured/i);
  await expect(page.getByRole('button', { name: 'Send test email' })).toBeVisible();
});

test('admin orders show owner email and verification controls', async ({ page }) => {
  await useAdminSession(page);
  await page.goto('/admin/orders');

  await expect(page.getByText(USER.email).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify payment' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reject payment' }).first()).toBeVisible();
});

test('QR payment dialog keeps Deep Insights disabled until detail payment is verified', async ({ page }) => {
  await useUserSession(page);
  await page.route('**/api/readings/rd_payment_preview', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_payment_preview',
        type: 'tarot',
        category: 'tarot',
        question: 'How should I proceed?',
        status: 'detail_unpaid',
        createdAt: '2026-10-30T10:00:00.000Z',
        owned: true,
        resultBasic: { deck: 'tarot', cards: [] },
        simpleReport: 'A free simple report.',
        detailedUnlocked: true,
        detailedPaid: false,
        detailedReport: 'The detailed report remains available after skipping payment.',
        detailPayment: {
          orderId: 'ord_payment_preview',
          orderStatus: 'pending',
          amountCents: 299,
        },
        deepInsights: {
          ordered: false,
          paid: false,
          ready: false,
          pending: false,
          submitted: false,
          report: null,
          orderId: null,
          orderStatus: null,
        },
        pricing: { detailCents: 299, deepInsightsCents: 499 },
      },
    }),
  }));
  await page.route('**/api/payment-methods', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: [
        {
          id: 'pm_paypal',
          name: 'PayPal',
          qrImage: 'data:image/png;base64,iVBORw0KGgo=',
          order: 0,
        },
        {
          id: 'pm_stripe',
          name: 'Stripe',
          qrImage: 'data:image/png;base64,iVBORw0KGgo=',
          order: 1,
        },
      ],
    }),
  }));

  await page.goto('/readings/rd_payment_preview');

  await expect(page.getByText('The detailed report remains available after skipping payment.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Get Deep Insights Report/ })).toBeDisabled();
  await page.getByRole('button', { name: /Pay detailed report/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByAltText('PayPal QR code')).toBeVisible();
  await expect(page.getByAltText('Stripe QR code')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip payment and view report' })).toBeVisible();
});

test('login exposes password recovery and offers verification resend', async ({ page }) => {
  let resendBody: unknown;
  await page.route('**/api/auth/login', (route) => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({
      error: 'Verify your email before signing in.',
      details: { code: 'EMAIL_NOT_VERIFIED' },
    }),
  }));
  await page.route('**/api/auth/resend-verification', (route) => {
    resendBody = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ok: true } }),
    });
  });

  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
  await page.getByLabel('Email').fill('reader@example.com');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible();
  await page.getByRole('button', { name: 'Resend verification email' }).click();
  await expect(page.getByText('A new verification email has been sent.')).toBeVisible();
  expect(resendBody).toEqual({ email: 'reader@example.com' });
});

test('forgot, reset, and verify email pages complete their API flows', async ({ page }) => {
  await page.route('**/api/auth/forgot-password', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { ok: true } }),
  }));
  await page.route('**/api/auth/reset-password', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { ok: true } }),
  }));
  await page.route('**/api/auth/verify-email', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: { verified: true } }),
  }));

  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('reader@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('If that email is registered, a reset link has been sent.')).toBeVisible();

  await page.goto('/reset-password?token=reset-token');
  await page.getByLabel('New password').fill('new-password');
  await page.getByLabel('Confirm password').fill('new-password');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Your password has been reset.')).toBeVisible();

  await page.goto('/verify-email?token=verify-token');
  await expect(page.getByText('Your email is verified.')).toBeVisible();
});

test('tarot draw renders loaded image artwork instead of generated placeholder art', async ({ page }) => {
  await page.route('**/api/readings', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_preview',
        resultBasic: {
          deck: 'tarot',
          cards: [{
            position: 'Draw',
            card: {
              name: 'The Fool',
              meaning: 'New beginnings.',
              reversed: false,
              arcana: 'major',
              num: 0,
            },
          }],
        },
      },
    }),
  }));
  await page.route('**/api/readings/rd_preview', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_preview',
        type: 'tarot',
        category: 'tarot',
        question: null,
        status: 'new',
        createdAt: '2026-10-26T10:00:00.000Z',
        owned: true,
        resultBasic: null,
        simpleReport: null,
        detailedUnlocked: false,
        detailedReport: null,
        deepInsights: {
          ordered: false,
          paid: false,
          ready: false,
          pending: false,
          report: null,
          orderId: null,
        },
        pricing: { detailCents: 299, deepInsightsCents: 499 },
      },
    }),
  }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tarot?deck=tarot');
  await page.getByRole('button', { name: 'Draw', exact: true }).click();

  const artwork = page.locator('.card-art-stage img');
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.tarot-card')).toHaveCount(1);
  expect(await page.locator('.tarot-card').evaluate((card) => card.getBoundingClientRect().width)).toBeLessThanOrEqual(252);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('Lenormand Pair is first in Sacred Layout and renders two cards', async ({ page }) => {
  await page.route('**/api/readings', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_lenormand_preview',
        resultBasic: {
          spread: 'lenormand_pair',
          label: 'Lenormand Pair',
          deck: 'lenormand',
          cards: [
            {
              position: 'Subject',
              card: {
                name: 'Crossroad',
                meaning: 'A choice, options, a decision point.',
                n: 22,
              },
            },
            {
              position: 'Modifier',
              card: {
                name: 'Rider',
                meaning: 'News, messages, something arriving soon.',
                n: 1,
              },
            },
          ],
        },
      },
    }),
  }));
  await page.route('**/api/readings/rd_lenormand_preview', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_lenormand_preview',
        type: 'lenormand_pair',
        category: 'spreads',
        question: null,
        status: 'new',
        createdAt: '2026-10-27T10:00:00.000Z',
        owned: true,
        resultBasic: null,
        simpleReport: null,
        detailedUnlocked: false,
        detailedReport: null,
        deepInsights: {
          ordered: false,
          paid: false,
          ready: false,
          pending: false,
          report: null,
          orderId: null,
        },
        pricing: { detailCents: 399, deepInsightsCents: 599 },
      },
    }),
  }));

  await page.goto('/spreads?type=lenormand_pair');
  await expect(page.locator('.form-field select')).toHaveValue('lenormand_pair');
  await page.getByRole('button', { name: 'Deal the Lenormand Pair' }).click();
  await expect(page.locator('.tarot-card')).toHaveCount(2);

  for (const name of ['Crossroad', 'Rider']) {
    const artwork = page.getByAltText(`${name} card artwork`);
    await expect(artwork).toBeVisible();
    await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator('.card-art-fallback')).toHaveCount(0);
});

test('Tarot Sacred Layout link and retired Lenormand URL use the spread query route', async ({ page }) => {
  await page.goto('/');
  const oracle = page.locator('.engine-cell').filter({ hasText: 'The Oracle Engine' });
  const sacred = page.locator('.engine-cell').filter({ hasText: 'The Sacred Layout Engine' });
  await expect(oracle.getByText('Lenormand', { exact: false })).toHaveCount(0);
  await expect(sacred.getByRole('link', { name: 'Lenormand Pair (2 cards)' })).toHaveAttribute(
    'href',
    '/spreads?type=lenormand_pair',
  );

  await page.goto('/tarot');
  await expect(page.getByRole('link', { name: 'Sacred Layout Engine' })).toHaveAttribute(
    'href',
    '/spreads?type=holy_triangle',
  );

  await page.goto('/tarot?deck=lenormand');
  await expect(page).toHaveURL(/\/spreads\?type=lenormand_pair$/);
});

test('spread cards keep uniform width and height with variable text', async ({ page }) => {
  await page.route('**/api/readings', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_spread_preview',
        resultBasic: {
          spread: 'holy_triangle',
          label: 'Holy Triangle',
          deck: 'tarot',
          cards: [
            {
              position: 'Past',
              card: {
                name: 'The Sun',
                meaning: 'Clarity.',
                reversed: false,
                arcana: 'major',
                num: 19,
              },
            },
            {
              position: 'Present',
              card: {
                name: 'The High Priestess',
                meaning: 'A much longer interpretation that spans several visual lines so the card heights cannot depend on the length of the explanation text.',
                reversed: true,
                arcana: 'major',
                num: 2,
              },
            },
            {
              position: 'Future',
              card: {
                name: 'Two of Wands',
                meaning: 'A deliberate choice between two possible directions.',
                reversed: false,
                arcana: 'minor',
                suit: 'wands',
                rank: 'Two',
              },
            },
          ],
        },
      },
    }),
  }));
  await page.route('**/api/readings/rd_spread_preview', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_spread_preview',
        type: 'holy_triangle',
        category: 'spreads',
        question: null,
        status: 'new',
        createdAt: '2026-10-27T10:00:00.000Z',
        owned: true,
        resultBasic: null,
        simpleReport: null,
        detailedUnlocked: false,
        detailedReport: null,
        deepInsights: {
          ordered: false,
          paid: false,
          ready: false,
          pending: false,
          report: null,
          orderId: null,
        },
        pricing: { detailCents: 399, deepInsightsCents: 599 },
      },
    }),
  }));

  await page.goto('/spreads?type=holy_triangle');
  await page.getByRole('button', { name: 'Deal the Holy Triangle' }).click();
  await expect(page.locator('.tarot-card')).toHaveCount(3);

  const boxes = await page.locator('.tarot-card').evaluateAll((cards) => cards.map((card) => {
    const rect = card.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));

  expect(Math.max(...boxes.map((box) => box.width)) - Math.min(...boxes.map((box) => box.width))).toBeLessThanOrEqual(1);
  expect(Math.max(...boxes.map((box) => box.height)) - Math.min(...boxes.map((box) => box.height))).toBeLessThanOrEqual(1);
  expect(boxes[0].width).toBeGreaterThanOrEqual(240);
  expect(boxes[0].height).toBeCloseTo(560, 3);
});

test('horizontal logo loads on desktop and mobile without overflow', async ({ page }) => {
  await page.goto('/');
  const logo = page.locator('img.brand-logo--horizontal');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveCSS('height', '84px');
  await expect(page.locator('.site-nav-outer')).toHaveCSS('background-color', 'rgb(244, 236, 216)');
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThanOrEqual(350);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveCSS('height', '68px');
  await expect.poll(
    () => page.evaluate(() => {
      const nav = document.querySelector('.site-nav');
      return document.documentElement.scrollWidth <= window.innerWidth
        && nav instanceof HTMLElement
        && nav.getBoundingClientRect().left >= 0
        && nav.getBoundingClientRect().right <= window.innerWidth;
    }),
    { timeout: 10_000 },
  ).toBe(true);
});

test('page content aligns with the public navigation and footer width', async ({ page }) => {
  for (const path of ['/', '/login', '/faq', '/privacy', '/library', '/astrology']) {
    await page.goto(path);
    const widths = await page.evaluate(() => {
      const nav = document.querySelector('.site-nav');
      const main = document.querySelector('main .container');
      const footer = document.querySelector('.site-footer .container');
      return {
        nav: nav?.getBoundingClientRect().width ?? null,
        main: main?.getBoundingClientRect().width ?? null,
        footer: footer?.getBoundingClientRect().width ?? null,
      };
    });

    expect(widths.nav).not.toBeNull();
    expect(Math.abs(widths.main! - widths.nav!)).toBeLessThanOrEqual(1);
    expect(Math.abs(widths.footer! - widths.nav!)).toBeLessThanOrEqual(1);
  }
});
