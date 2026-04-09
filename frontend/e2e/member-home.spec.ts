import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const USER_PASSWORD = 'Member@1234';
const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
}

interface PersistedAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
  } | null;
  isAuthenticated: boolean;
}

interface UserMembership {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  bookingsUsedThisMonth: number;
  maxBookingsPerMonth: number;
}

interface MembershipPlanSummary {
  id: string;
  name: string;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as JwtPayload;
}

async function registerViaApi(
  request: APIRequestContext,
  email: string,
  password = USER_PASSWORD
): Promise<void> {
  const res = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<LoginResponse>;
}

async function createUserSession(
  request: APIRequestContext,
  prefix = 'e2e-home'
): Promise<{ email: string; accessToken: string; refreshToken: string; userId: string }> {
  const email = uniqueEmail(prefix);
  await registerViaApi(request, email);
  const session = await loginViaApi(request, email, USER_PASSWORD);
  const payload = decodeJwtPayload(session.accessToken);
  return { email, accessToken: session.accessToken, refreshToken: session.refreshToken, userId: payload.sub };
}

async function seedPersistedAuth(page: Page, state: PersistedAuthState): Promise<void> {
  await page.addInitScript((s) => {
    window.localStorage.setItem('gymflow-auth', JSON.stringify({ state: s, version: 0 }));
  }, state);
}

function buildAuthState(
  email: string,
  userId: string,
  accessToken: string,
  refreshToken: string
): PersistedAuthState {
  return {
    accessToken,
    refreshToken,
    user: { id: userId, email, role: 'USER' },
    isAuthenticated: true,
  };
}

async function getFirstActivePlan(
  request: APIRequestContext,
  accessToken: string
): Promise<MembershipPlanSummary> {
  const res = await request.get(`${API_BASE}/membership-plans?page=0&size=20`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json() as PaginatedResponse<MembershipPlanSummary>;
  expect(data.content.length).toBeGreaterThan(0);
  return data.content[0];
}

async function purchaseMembershipViaApi(
  request: APIRequestContext,
  accessToken: string,
  planId: string
): Promise<UserMembership> {
  const res = await request.post(`${API_BASE}/memberships`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { planId },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<UserMembership>;
}

async function cancelMembershipViaApi(
  request: APIRequestContext,
  accessToken: string
): Promise<void> {
  const res = await request.delete(`${API_BASE}/memberships/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(res.ok()).toBeTruthy();
}

async function loginAsAdminApi(request: APIRequestContext): Promise<string> {
  const session = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  return session.accessToken;
}

async function deactivateAllPlansViaApi(
  request: APIRequestContext,
  adminToken: string
): Promise<string[]> {
  const res = await request.get(`${API_BASE}/membership-plans?page=0&size=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json() as PaginatedResponse<{ id: string; active: boolean }>;
  const activePlans = data.content.filter((p) => p.active);
  for (const plan of activePlans) {
    const deactivateRes = await request.patch(`${API_BASE}/membership-plans/${plan.id}/deactivate`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(deactivateRes.ok()).toBeTruthy();
  }
  return activePlans.map((p) => p.id);
}

async function reactivatePlansViaApi(
  request: APIRequestContext,
  adminToken: string,
  planIds: string[]
): Promise<void> {
  for (const planId of planIds) {
    await request.patch(`${API_BASE}/membership-plans/${planId}/activate`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('Member Home', () => {

  // -------------------------------------------------------------------------
  // AC 2 — Unauthenticated access blocked
  // -------------------------------------------------------------------------

  test('AC-02 unauthenticated visitor is redirected to /login when navigating to /home', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL('/login');
  });

  // -------------------------------------------------------------------------
  // AC 1 — Authenticated USER lands on /home
  // -------------------------------------------------------------------------

  test('AC-01 authenticated USER account is routed to /home as the post-login destination', async ({ page, request }) => {
    const { email } = await createUserSession(request);
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', USER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/home');
    await expect(page.getByTestId('member-home-root')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 3 — Three sections present
  // -------------------------------------------------------------------------

  test('AC-03 Member Home contains membership status, trainer preview, and classes preview sections', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    // Membership section
    await expect(page.locator('#membership')).toBeVisible();
    // Trainer carousel heading
    await expect(page.getByRole('heading', { name: 'Meet the coaches' })).toBeVisible();
    // Classes carousel heading
    await expect(page.getByRole('heading', { name: 'Next up in the club' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 4 — Membership section is first primary content section
  // -------------------------------------------------------------------------

  test('AC-04 hero renders before the membership section in DOM order', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    const heroHeading = page.getByRole('heading', { name: /Welcome back/ });
    const membershipSection = page.locator('#membership');

    await expect(heroHeading).toBeVisible();
    await expect(membershipSection).toBeVisible();

    // Hero must appear before the membership section in the DOM
    const heroBox = await heroHeading.boundingBox();
    const memberBox = await membershipSection.boundingBox();
    expect(heroBox!.y).toBeLessThan(memberBox!.y);
  });

  // -------------------------------------------------------------------------
  // AC 5 — Active membership shows plan name, status, dates, booking summary
  // -------------------------------------------------------------------------

  test('AC-05 active membership card shows plan name, status badge, start date, end date, and booking usage', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    const plan = await getFirstActivePlan(request, accessToken);
    await purchaseMembershipViaApi(request, accessToken, plan.id);

    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: plan.name })).toBeVisible();
    await expect(page.getByText('Start date')).toBeVisible();
    await expect(page.getByText('End date')).toBeVisible();
    await expect(page.getByText('Bookings this month')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 6 — Active membership: full plans catalogue NOT shown inline
  // -------------------------------------------------------------------------

  test('AC-06 active membership state does not render the full public plans catalogue inline', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    const plan = await getFirstActivePlan(request, accessToken);
    await purchaseMembershipViaApi(request, accessToken, plan.id);

    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.locator('#membership').getByRole('link', { name: 'View plan' })).toHaveCount(0);
    await expect(page.locator('#membership').getByRole('link', { name: 'Compare all plans' })).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // AC 5 (secondary CTA) — Active membership "Open schedule" CTA
  // -------------------------------------------------------------------------

  test('AC-05 active membership card shows "Open schedule" as secondary CTA', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    const plan = await getFirstActivePlan(request, accessToken);
    await purchaseMembershipViaApi(request, accessToken, plan.id);

    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.locator('#membership').getByRole('button', { name: 'Open schedule' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 7 — No active membership: empty state headline
  // -------------------------------------------------------------------------

  test('AC-07 no-active-membership state shows "Activate your access" headline', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.locator('#membership').getByRole('heading', { name: 'Activate your access' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 7 secondary CTA — "See what's inside the club"
  // -------------------------------------------------------------------------

  test('AC-07 no-active-membership state shows "See schedule" CTA', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(
      page.locator('#membership').getByRole('button', { name: "See schedule" })
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 8 — No active membership: plan teasers shown when plans exist
  // -------------------------------------------------------------------------

  test('AC-08 no-active-membership state shows plan teasers when active plans exist', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(
      page.locator('#membership').getByRole('link', { name: 'View plan' }).first()
    ).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 9 — No plans available state
  // -------------------------------------------------------------------------

  test('AC-09 when no active plans exist, membership section shows unavailable state instead of empty purchase area', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const deactivatedIds = await deactivateAllPlansViaApi(request, adminToken);

    try {
      const { email, userId, accessToken, refreshToken } = await createUserSession(request);
      await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
      await page.goto('/home');

      await expect(page.locator('#membership').getByText('No plans available right now')).toBeVisible();
      await expect(
        page.locator('#membership').getByRole('link', { name: 'View plan' })
      ).toHaveCount(0);
    } finally {
      await reactivatePlansViaApi(request, adminToken, deactivatedIds);
    }
  });

  // -------------------------------------------------------------------------
  // AC 10 — Trainer carousel renders
  // -------------------------------------------------------------------------

  test('AC-10 trainer preview section renders as a horizontally browseable carousel', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Meet the coaches' })).toBeVisible();
    await expect(page.getByRole('article').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' }).first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 11 — Trainer cards include name, specialization, supporting text
  // -------------------------------------------------------------------------

  test('AC-11 each trainer card includes trainer name, specialization, and experience summary', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    // At least one article with trainer name link and experience text
    const firstCard = page.getByRole('article').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByRole('link', { name: 'View profile' })).toBeVisible();
    // Experience or specialization text
    await expect(firstCard.getByText(/yrs experience|Experience not specified/)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 11 — Trainer placeholder renders when no photo
  // -------------------------------------------------------------------------

  test('AC-11 trainer card renders initials placeholder when trainer has no photo', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    // The seed data includes trainers without profile photos; initials placeholder is a div with 2-char text
    const placeholders = page.getByRole('article').locator('a > div').filter({ hasText: /^[A-Z]{2}$/ });
    await expect(placeholders.first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 12 — "See all trainers" link
  // -------------------------------------------------------------------------

  test('AC-12 trainer section includes a "See all trainers" link leading to /trainers', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    const link = page.getByRole('link', { name: 'See all trainers' }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/trainers');
  });

  // -------------------------------------------------------------------------
  // AC 13 — No personal-training booking actions on trainer cards
  // -------------------------------------------------------------------------

  test('AC-13 trainer carousel does not expose booking or personal-training actions', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    // Assert no "Book" or "Request" buttons inside trainer cards
    await expect(page.getByRole('article').getByRole('button', { name: /book|request|hire/i })).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // AC 14 — Classes carousel renders
  // -------------------------------------------------------------------------

  test('AC-14 upcoming classes section renders as a horizontally browseable carousel', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Next up in the club' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' }).last()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 15 — Class cards include name, date, time, trainer name
  // -------------------------------------------------------------------------

  test('AC-15 each class card includes class name, scheduled date, start time, and trainer name', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Next up in the club' })).toBeVisible();

    // Wait for classes to load (not the loading skeleton)
    await expect(page.getByLabel('Loading upcoming classes')).toHaveCount(0);

    // Check first class article has expected elements
    // Classes carousel is in the last section; narrow scope to the classes section
    const classSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Next up in the club' }) });
    const firstClassCard = classSection.getByRole('article').first();
    await expect(firstClassCard).toBeVisible();

    // Class name — bold text that is not duration/trainer
    const cardText = await firstClassCard.innerText();
    expect(cardText.length).toBeGreaterThan(5);

    // Time format hh:mm - hh:mm
    await expect(firstClassCard.getByText(/\d{2}:\d{2} - \d{2}:\d{2}/)).toBeVisible();
    // Date label
    await expect(firstClassCard.getByText(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 18 — "See full schedule" link
  // -------------------------------------------------------------------------

  test('AC-18 classes section includes a "See full schedule" link leading to /schedule', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');

    const link = page.getByRole('link', { name: 'See full schedule' }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/schedule');
  });

  // -------------------------------------------------------------------------
  // AC 19 — Trainer section error does not block other sections
  // -------------------------------------------------------------------------

  test('AC-19 when trainer data fails, membership and classes sections still render', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));

    // Intercept trainer API to simulate failure
    await page.route('**/api/v1/trainers**', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await page.goto('/home');

    // Membership section still renders
    await expect(page.locator('#membership')).toBeVisible();
    // Classes section still renders
    await expect(page.getByRole('heading', { name: 'Next up in the club' })).toBeVisible();
    // Trainer section shows error state
    await expect(page.getByRole('heading', { name: 'Trainers unavailable' })).toBeVisible();
    // Error card has distinct title and body (not duplicate)
    const errorCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Trainers unavailable' }) }).first();
    const errorTitle = errorCard.getByRole('heading', { name: 'Trainers unavailable' });
    await expect(errorTitle).toBeVisible();
    // Body should not be "Trainers unavailable" (no duplication)
    const bodyParagraph = errorCard.locator('p').first();
    await expect(bodyParagraph).not.toHaveText('Trainers unavailable');
  });

  // -------------------------------------------------------------------------
  // AC 20 — Classes section error does not block other sections
  // -------------------------------------------------------------------------

  test('AC-20 when classes data fails, membership and trainer sections still render', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));

    await page.route('**/api/v1/member-home/classes-preview**', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await page.goto('/home');

    await expect(page.locator('#membership')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Meet the coaches' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Classes unavailable' })).toBeVisible();
    // Body should not duplicate the title
    const errorCard = page.locator('div').filter({ has: page.getByRole('heading', { name: 'Classes unavailable' }) }).first();
    const bodyParagraph = errorCard.locator('p').first();
    await expect(bodyParagraph).not.toHaveText('Classes unavailable');
  });

  // -------------------------------------------------------------------------
  // AC 21 — Membership section error does not block carousels
  // -------------------------------------------------------------------------

  test('AC-21 when membership data fails, trainer and classes sections still render', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));

    await page.route('**/api/v1/memberships/me', (route) => route.fulfill({ status: 500, body: 'Internal Server Error' }));

    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'Meet the coaches' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Next up in the club' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Membership unavailable' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 22 — Empty trainer state
  // -------------------------------------------------------------------------

  test('AC-22 when no trainers are available, trainer section shows empty state instead of broken carousel', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));

    await page.route('**/api/v1/trainers**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 6 }),
      })
    );

    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'No trainers to show yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // AC 23 — Empty classes state
  // -------------------------------------------------------------------------

  test('AC-23 when no upcoming classes exist, classes section shows empty state instead of broken carousel', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));

    await page.route('**/api/v1/member-home/classes-preview**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: [], timeZone: 'UTC' }),
      })
    );

    await page.goto('/home');

    await expect(page.getByRole('heading', { name: 'No upcoming classes' })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // AC 25 — After cancellation, home shows no-membership state
  // -------------------------------------------------------------------------

  test('AC-25 after membership is cancelled, next load of /home shows no-active-membership state', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    const plan = await getFirstActivePlan(request, accessToken);
    await purchaseMembershipViaApi(request, accessToken, plan.id);

    // First visit — active state
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: plan.name })).toBeVisible();

    // Cancel via API
    await cancelMembershipViaApi(request, accessToken);

    // Reload — should show no-active-membership state
    await page.reload();
    await expect(page.locator('#membership').getByRole('heading', { name: 'Activate your access' })).toBeVisible();
    await expect(page.getByRole('heading', { name: plan.name })).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // AC 26 — No horizontal overflow at 360 px
  // -------------------------------------------------------------------------

  test('AC-26 page has no horizontal overflow at 360px viewport width', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/home');

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  // -------------------------------------------------------------------------
  // AC 24 — After purchase from home flow, membershipBanner param triggers
  // -------------------------------------------------------------------------

  test('AC-24 navigating to /home with ?membershipBanner=activated shows activated banner', async ({ page, request }) => {
    const { email, userId, accessToken, refreshToken } = await createUserSession(request);
    const plan = await getFirstActivePlan(request, accessToken);
    await purchaseMembershipViaApi(request, accessToken, plan.id);

    await seedPersistedAuth(page, buildAuthState(email, userId, accessToken, refreshToken));
    await page.goto('/home?membershipBanner=activated');

    // Banner should appear
    await expect(page.getByTestId('member-home-root').getByText(/activated|welcome|membership active/i)).toBeVisible();
    // URL should be cleaned up (banner param stripped)
    await expect(page).not.toHaveURL(/membershipBanner/);
  });
});
