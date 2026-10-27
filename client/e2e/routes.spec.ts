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

test('user auth provider restores the session and renders the circular workspace logo', async ({ page }) => {
  await useUserSession(page);
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Your dashboard', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Your dashboard' })).toBeVisible();

  const logo = page.locator('img.brand-logo--circular');
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Load more readings' }).click();
  await expect(page.getByText('Second page reading')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('tarawing_token'))).toBeNull();
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
  await expect(page.locator('.tarot-card')).toHaveCSS('max-width', '190px');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('lenormand draw renders the numbered card image', async ({ page }) => {
  await page.route('**/api/readings', (route) => route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({
      data: {
        id: 'rd_lenormand_preview',
        resultBasic: {
          deck: 'lenormand',
          cards: [{
            position: 'Draw',
            card: {
              name: 'Crossroad',
              meaning: 'A choice, options, a decision point.',
              n: 22,
            },
          }],
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
        type: 'lenormand',
        category: 'tarot',
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
        pricing: { detailCents: 299, deepInsightsCents: 499 },
      },
    }),
  }));

  await page.goto('/tarot?deck=lenormand');
  await page.getByRole('button', { name: 'Draw', exact: true }).click();

  const artwork = page.getByAltText('Crossroad card artwork');
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.card-art-fallback')).toHaveCount(0);
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
