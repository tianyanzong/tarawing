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
            productCode: cursor ? 'detail_spreads' : 'detail_tarot',
            amountCents: cursor ? 399 : 299,
            currency: 'USD',
            status: 'paid',
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
        adminNotes: null,
      },
    }),
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
  expect(boxes[0].height).toBe(560);
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
