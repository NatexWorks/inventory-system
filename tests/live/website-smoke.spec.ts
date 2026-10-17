import { expect, test } from '@playwright/test';

const siteRoutes = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/dashboard',
  '/products',
  '/categories',
  '/suppliers',
  '/reports',
  '/orders',
  '/pos',
  '/addProducts',
];

test.describe('Live website smoke checks', () => {
  test('homepage has working HTML, metadata, and a main heading', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'homepage should return a document response').not.toBeNull();
    expect(response!.status()).toBe(200);
    await expect(page).toHaveTitle(/Inventory System/i);
    await expect(page.locator('h1').first()).toContainText(/inventory/i);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length).toBeGreaterThan(30);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('known application routes do not return server errors or blank documents', async ({ page }) => {
    for (const route of siteRoutes) {
      const response = await page.goto(route);
      expect(response, `no document response for ${route}`).not.toBeNull();
      expect(response!.status(), `${route} returned HTTP ${response!.status()}`).toBeLessThan(500);
      await expect(page.locator('body'), `${route} rendered a blank body`).not.toBeEmpty();
    }
  });

  test('unknown route returns a real 404 page', async ({ page }) => {
    const response = await page.goto('/__playwright_missing_route__');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('robots.txt and sitemap.xml are reachable and reference the deployed domain', async ({ request }) => {
    const robotsResponse = await request.get('/robots.txt');
    expect(robotsResponse.status()).toBe(200);
    const robots = await robotsResponse.text();
    expect(robots).toContain('User-Agent: *');
    expect(robots).toContain('/sitemap.xml');
    expect(robots).toContain('Disallow: /api/');

    const sitemapResponse = await request.get('/sitemap.xml');
    expect(sitemapResponse.status()).toBe(200);
    expect(sitemapResponse.headers()['content-type']).toMatch(/xml/i);
    const sitemap = await sitemapResponse.text();
    expect(sitemap).toContain('<urlset');
    expect(sitemap).toContain('https://inventory-system-mu-puce.vercel.app');
  });

  test('private APIs reject unauthenticated requests', async ({ request }) => {
    for (const endpoint of ['/api/auth/me', '/api/dashboard']) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should require a session`).toBe(401);
      expect(response.headers()['content-type']).toMatch(/application\/json/i);
    }
  });

  test('auth APIs reject malformed input without exposing server errors', async ({ request }) => {
    const cases = [
      ['/api/auth/send-otp', { email: 'not-an-email', purpose: 'signup' }],
      ['/api/auth/login', { email: 'bad', password: 'x' }],
      ['/api/auth/signup', { name: '', email: 'bad', password: 'x', otp: '000000' }],
      ['/api/auth/forgot-password', { email: 'bad' }],
    ] as const;

    for (const [endpoint, data] of cases) {
      const response = await request.post(endpoint, { data });
      // Production rate limiting may return 429 before validation is reached.
      if (response.status() === 429) {
        const payload = await response.json();
        expect(payload.success).toBe(false);
        continue;
      }
      expect(response.status(), `${endpoint} should validate malformed input`).toBe(400);
      const payload = await response.json();
      expect(payload.success).toBe(false);
      expect(payload.message).toMatch(/validation/i);
    }
  });

  test('homepage internal links do not point to malformed URLs', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((anchor) => (anchor as HTMLAnchorElement).getAttribute('href') || ''),
    );

    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      expect(href, 'anchor href should not be empty').not.toBe('');
      expect(href, `unsafe javascript link found: ${href}`).not.toMatch(/^javascript:/i);
      if (href.startsWith('/')) {
        expect(() => new URL(href, 'https://inventory-system-mu-puce.vercel.app')).not.toThrow();
      }
    }
  });

  test('homepage does not throw uncaught browser JavaScript errors', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(pageErrors, 'uncaught browser errors: ' + pageErrors.join(' | ')).toEqual([]);
  });

  test('mobile viewport has no horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.page,
      `horizontal overflow: page width ${dimensions.page}px vs viewport ${dimensions.viewport}px`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
});
