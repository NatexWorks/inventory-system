import { expect, test } from '@playwright/test';
import { getTestUsers, loadSeedData } from '../fixtures/testData';
import { AuthPage } from '../page-objects/AuthPage';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('logs in, reaches the dashboard, and logs out', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);

    await expect(page).toHaveURL(/\/dashboard$/);
    await auth.expectHeading(/Welcome back/i);

    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('reopens the main URL by validating the saved backend session and redirecting to the dashboard', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);
    await expect(page).toHaveURL(/\\/dashboard$/);

    // Simulate opening the public production URL again in the same browser.
    const verifiedSession = page.waitForResponse((response) =>
      response.url().endsWith('/api/auth/me') &&
      response.request().method() === 'GET'
    );
    await page.goto('/');
    const response = await verifiedSession;

    expect(response.ok()).toBeTruthy();
    expect(response.headers()['x-inventory-offline-session']).not.toBe('true');
    await expect(page).toHaveURL(/\\/dashboard$/);
    await auth.expectHeading(/Welcome back/i);
  });

  test('signs up a fresh workspace user', async ({ page }) => {
    const auth = new AuthPage(page);
    const runId = loadSeedData().runId;
    const email = `new-owner-${runId}-${Date.now()}@example.com`;

    await auth.goto('/signup');
    await auth.signup(`New Owner ${runId}`, email, 'Password123!');

    await expect(page).toHaveURL(/\/dashboard$/);
    await auth.expectHeading(/Welcome back/i);
  });

  test('redirects unauthenticated visitors to login and remembers the requested page', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('opens protected pages after logging in', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /Products List/i })).toBeVisible();

    await page.getByRole('link', { name: /Dashboard/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });

  test('workspace content stays visible and numeric values do not run outside narrow screens', async ({ page }) => {
    test.setTimeout(120_000);
    const auth = new AuthPage(page);
    const users = getTestUsers();
    await page.setViewportSize({ width: 390, height: 844 });
    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    const routes = ['/dashboard', '/products', '/categories', '/orders', '/suppliers', '/reports', '/settings', '/addProducts'];
    const widths = [320, 360, 390, 430];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      for (const width of widths) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        const layout = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const isHidden = (element: Element) => {
            let current: Element | null = element;
            while (current) {
              const style = getComputedStyle(current);
              if (style.display === 'none' || style.visibility === 'hidden' || current.hasAttribute('inert') || current.getAttribute('aria-hidden') === 'true') return true;
              current = current.parentElement;
            }
            return false;
          };
          const horizontalScroller = (element: Element) => {
            let current = element.parentElement;
            while (current && current !== document.body) {
              const style = getComputedStyle(current);
              if (/(auto|scroll)/.test(style.overflowX) || current.classList.contains('overflow-x-auto')) return current;
              current = current.parentElement;
            }
            return null;
          };
          const visible = (element: Element) => {
            if (isHidden(element)) return false;
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };
          const issues: Array<{ kind: string; tag: string; text: string; left?: number; right?: number; width?: number; scrollWidth?: number }> = [];

          // Check layout boxes and controls, while allowing wide tables to scroll only inside their own scroller.
          document.querySelectorAll('body section, body article, body h1, body h2, body h3, body p, body button, body a, body input, body select, body textarea, body [role="status"], body [role="alert"], body [class*="overflow-x-auto"]').forEach((element) => {
            if (!visible(element) || horizontalScroller(element)) return;
            const rect = element.getBoundingClientRect();
            if (rect.left < -1 || rect.right > viewport + 1) {
              issues.push({ kind: 'element-outside-viewport', tag: element.tagName.toLowerCase(), text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), width: viewport });
            }
          });

          // Check intrinsic overflow in text containers too; overflow-x: clip on the document must not hide the test failure.
          document.querySelectorAll('body h1, body h2, body h3, body p, body button, body a, body label, body [role="status"], body [role="alert"], body section, body article').forEach((element) => {
            if (!visible(element) || horizontalScroller(element)) return;
            const el = element as HTMLElement;
            if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
              issues.push({ kind: 'content-clipped-inside-element', tag: element.tagName.toLowerCase(), text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80), width: el.clientWidth, scrollWidth: el.scrollWidth });
            }
          });

          // Inspect actual rendered text ranges, including long currency and count values.
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const text = node.textContent?.replace(/\s+/g, ' ').trim() || '';
            const parent = node.parentElement;
            if (!text || !parent || isHidden(parent) || horizontalScroller(parent)) continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            for (const rect of Array.from(range.getClientRects())) {
              if (rect.width < 0.5 || rect.height < 0.5) continue;
              if (rect.left < -1 || rect.right > viewport + 1) {
                issues.push({ kind: /[0-9]/.test(text) ? 'number-or-text-outside-viewport' : 'text-outside-viewport', tag: parent.tagName.toLowerCase(), text: text.slice(0, 80), left: Math.round(rect.left), right: Math.round(rect.right), width: viewport });
                break;
              }
            }
          }

          const pageWidth = document.documentElement.scrollWidth;
          const bodyWidth = document.body.scrollWidth;
          if (pageWidth > viewport + 1 || bodyWidth > viewport + 1) {
            issues.push({ kind: 'document-horizontal-overflow', tag: 'body', text: '', width: viewport, scrollWidth: Math.max(pageWidth, bodyWidth) });
          }
          return { viewport, issues: issues.slice(0, 20) };
        });

        expect(layout.issues, `${route} has clipped or off-screen UI at ${width}px: ${JSON.stringify(layout)}`).toEqual([]);
      }
    }
  });


  test('mobile controls stay within the viewport and use progressive lists', async ({ page }) => {
    test.setTimeout(120_000);
    const auth = new AuthPage(page);
    const users = getTestUsers();
    await page.setViewportSize({ width: 320, height: 844 });
    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);

    // The notification surface is portalled outside nav/backdrop containers and must fit the phone.
    const notificationButton = page.getByRole('button', { name: /notifications/i });
    await notificationButton.click();
    const panel = page.getByTestId('notification-panel');
    await expect(panel).toBeVisible();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(321);
    await page.getByRole('button', { name: /close notifications/i }).click();

    // Product actions remain icon-only on phones but keep accessible labels.
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /Products List/i })).toBeVisible();
    const editAction = page.getByRole('button', { name: /^Edit /i }).first();
    await expect(editAction).toBeVisible();
    await expect(editAction.locator('span')).toBeHidden();

    // Six quick-add products appear first on phones; Show more reveals the rest of the current page.
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: /Orders Overview/i })).toBeVisible();
    const quickAddList = page.getByTestId('quick-add-product-list');
    await expect(quickAddList.locator('button')).toHaveCount(6);
    await page.getByRole('button', { name: /Show more/i }).first().click();
    await expect(quickAddList.locator('button')).toHaveCount(12);

    // Billing Rules are collapsed by default on phones and can be opened on demand.
    const billingRules = page.getByRole('button', { name: /Show rules/i });
    await expect(billingRules).toBeVisible();
    await expect(page.getByText('Stock deduction', { exact: true })).toBeHidden();
    await billingRules.click();
    await expect(page.getByText('Stock deduction', { exact: true })).toBeVisible();

    // Reports render ten rows at a time and reveal additional inventory rows on demand.
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: /Reports Dashboard/i })).toBeVisible();
    await page.getByRole('button', { name: /Inventory Report/i }).click();
    const reportRows = page.locator('table tbody tr');
    await expect(reportRows).toHaveCount(10);
    await page.getByRole('button', { name: /Show more/i }).last().click();
    await expect(reportRows).toHaveCount(12);
  });

  test('report chart zoom stays inside the smallest supported phone viewport', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();
    await page.setViewportSize({ width: 320, height: 844 });
    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);

    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: /Reports Dashboard/i })).toBeVisible();
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const chart = page.locator('svg[aria-label^="Sales revenue graph"]');
    await expect(chart).toBeVisible();
    const standard = await chart.boundingBox();
    expect(standard).not.toBeNull();

    const zoom = page.getByTestId('report-size-toggle');
    await expect(zoom).toBeVisible();
    await expect(zoom).toHaveAttribute('aria-pressed', 'false');
    await zoom.click();
    await expect(zoom).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await chart.boundingBox())?.height || 0).toBeGreaterThan(standard!.height + 30);

    const enlarged = await chart.boundingBox();
    expect(enlarged).not.toBeNull();
    expect(enlarged!.x).toBeGreaterThanOrEqual(-1);
    expect(enlarged!.x + enlarged!.width).toBeLessThanOrEqual(321);

    await zoom.click();
    await expect(zoom).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await chart.boundingBox())?.height || 0).toBeLessThan(enlarged!.height);
  });

  test('shows the read-only demo credentials on login and signup pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Try the demo account')).toBeVisible();
    await expect(page.getByText('demo@inventory-system.test', { exact: true })).toBeVisible();
    await expect(page.getByText('Demo@12345', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /fill demo credentials/i }).click();
    await expect(page.getByLabel('Email')).toHaveValue('demo@inventory-system.test');
    await expect(page.getByLabel('Password')).toHaveValue('Demo@12345');

    await page.goto('/signup');
    await expect(page.getByText('Try the demo account')).toBeVisible();
    await expect(page.getByText('demo@inventory-system.test', { exact: true })).toBeVisible();
    await expect(page.getByText('Demo@12345', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /open demo login/i })).toBeVisible();
  });

  test('shows a safe dashboard error instead of API server diagnostics', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();
    await auth.goto('/login');
    await auth.login(users.owner.email, users.owner.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.route('**/api/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Set OTP_SECRET or JWT_SECRET to a random secret',
          errors: ['Internal database diagnostic'],
        }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText('Failed to load dashboard')).toBeVisible();
    await expect(page.getByText(/Set OTP_SECRET|Internal database diagnostic/i)).toHaveCount(0);
  });

  test('shows validation and recovery flows', async ({ page }) => {
    const auth = new AuthPage(page);
    const users = getTestUsers();

    await auth.goto('/login');
    await page.getByLabel('Email').fill(users.owner.email);
    await page.getByLabel('Password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /^login$/i }).click();
    await auth.expectError(/invalid credentials|email/i);

    await auth.goto('/forgot-password');
    await page.getByLabel('Email').fill('missing-user@example.com');
    await page.getByRole('button', { name: /send reset code/i }).click();
    await expect(page).toHaveURL(/\/signup\?email=.*notice=account-not-found/);
    await expect(page.getByLabel('Email')).toHaveValue('missing-user@example.com');
    await expect(page.getByText(/No account was found for this email/i)).toBeVisible();
  });
});
