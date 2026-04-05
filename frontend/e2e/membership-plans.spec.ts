import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import type { MembershipPlan, MembershipPlanRequest, PaginatedPlans, PlanStatus } from '../src/types/membershipPlan';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';
const NONEXISTENT_PLAN_ID = '00000000-0000-0000-0000-000000000999';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

function uniquePlanName(label: string): string {
  return `E2E Plan ${label} ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function buildPlanRequest(overrides: Partial<MembershipPlanRequest> = {}): MembershipPlanRequest {
  return {
    name: uniquePlanName('Base'),
    description: 'Automated E2E membership plan description.',
    priceInCents: 3900,
    durationDays: 30,
    ...overrides,
  };
}

function mockPlan(index: number, status: PlanStatus, namePrefix: string): MembershipPlan {
  return {
    id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    name: `${namePrefix} ${index}`,
    description: `Mocked membership plan ${index}.`,
    priceInCents: 3000 + index,
    durationDays: 30 + index,
    maxBookingsPerMonth: 8 + index,
    status,
    createdAt: '2026-03-29T09:00:00Z',
    updatedAt: '2026-03-29T09:00:00Z',
  };
}

function paginatedPlans(content: MembershipPlan[], page: number, size: number, totalElements: number): PaginatedPlans {
  return {
    content,
    totalElements,
    totalPages: totalElements === 0 ? 0 : Math.ceil(totalElements / size),
    number: page,
    size,
  };
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/admin/plans');
}

async function loginAsAdminApi(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json() as LoginResponse;
  return body.accessToken;
}

async function registerUserApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<void> {
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
}

async function loginUserApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<LoginResponse>;
}

async function createPlanApi(
  request: APIRequestContext,
  adminToken: string,
  overrides: Partial<MembershipPlanRequest> = {}
): Promise<MembershipPlan> {
  const payload = buildPlanRequest(overrides);
  const response = await request.post(`${API_BASE}/membership-plans`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<MembershipPlan>;
}

async function deactivatePlanApi(
  request: APIRequestContext,
  adminToken: string,
  planId: string
): Promise<MembershipPlan> {
  const response = await request.patch(`${API_BASE}/membership-plans/${planId}/deactivate`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<MembershipPlan>;
}

async function fillPlanForm(page: Page, request: MembershipPlanRequest) {
  await page.fill('#plan-name', request.name);
  await page.fill('#plan-description', request.description);
  await page.fill('#plan-price', String(request.priceInCents));
  await page.fill('#plan-duration', String(request.durationDays));
}

function rowForPlan(page: Page, planName: string) {
  return page.locator('tbody tr', { hasText: planName }).first();
}

test.describe('Membership Plans', () => {
  test('PLAN-01 /plans page loads and shows at least one active plan card', async ({ page }) => {
    await page.goto('/plans');

    await expect(page.getByRole('link', { name: /^View details for / }).first()).toBeVisible();
  });

  test('PLAN-02 clicking a plan card navigates to the plan detail page', async ({ page }) => {
    await page.goto('/plans');

    const firstCard = page.getByRole('link', { name: /^View details for / }).first();
    await firstCard.waitFor({ state: 'visible' });

    const ariaLabel = await firstCard.getAttribute('aria-label');
    const planName = ariaLabel?.replace('View details for ', '') ?? '';

    await firstCard.click();

    await expect(page).toHaveURL(/\/plans\/.+/);
    await expect(page.getByRole('heading', { name: planName })).toBeVisible();
  });

  test('PLAN-03 public plan detail renders name, description, duration, price, and CTA', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Detail'),
      description: 'Unlimited weekday access with trainer support.',
      priceInCents: 4900,
      durationDays: 45,
    });

    await page.goto(`/plans/${plan.id}`);

    await expect(page.getByRole('heading', { name: plan.name })).toBeVisible();
    await expect(page.getByText(plan.description)).toBeVisible();
    await expect(page.getByText('$49.00')).toBeVisible();
    await expect(page.getByText('45 days')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible();
  });

  test('PLAN-04 opening a non-existent plan detail shows the not-found state', async ({ page }) => {
    await page.goto(`/plans/${NONEXISTENT_PLAN_ID}`);

    await expect(page.getByRole('heading', { name: 'Plan not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse all plans' })).toBeVisible();
  });

  test('PLAN-05 guest direct access to an inactive plan detail shows the not-found state', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Inactive Detail'),
    });

    await deactivatePlanApi(request, adminToken, plan.id);

    await page.goto(`/plans/${plan.id}`);

    await expect(page.getByRole('heading', { name: 'Plan not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse all plans' })).toBeVisible();
  });

  test('PLAN-06 public catalog empty state renders when there are no active plans', async ({ page }) => {
    await page.route('**/api/v1/membership-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(paginatedPlans([], 0, 9, 0)),
      });
    });

    await page.goto('/plans');

    await expect(page.getByText('No plans available')).toBeVisible();
    await expect(page.getByText('Check back later for available membership options.')).toBeVisible();
  });

  test('PLAN-07 public catalog pagination changes the page number and visible plan set', async ({ page }) => {
    const firstPagePlans = Array.from({ length: 9 }, (_, index) => mockPlan(index + 1, 'ACTIVE', 'PLAN-07 Page One'));
    const secondPagePlans = Array.from({ length: 2 }, (_, index) => mockPlan(index + 101, 'ACTIVE', 'PLAN-07 Page Two'));

    await page.route('**/api/v1/membership-plans**', async (route) => {
      const url = new URL(route.request().url());
      const requestedPage = Number(url.searchParams.get('page') ?? '0');

      const payload = requestedPage === 1
        ? paginatedPlans(secondPagePlans, 1, 9, 11)
        : paginatedPlans(firstPagePlans, 0, 9, 11);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.goto('/plans');

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details for PLAN-07 Page One 1' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details for PLAN-07 Page Two 101' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details for PLAN-07 Page Two 101' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details for PLAN-07 Page One 1' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Previous' }).click();

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View details for PLAN-07 Page One 1' })).toBeVisible();
  });

  test('PLAN-08 unauthenticated guest visiting /admin/plans is redirected to /plans', async ({ page }) => {
    await page.goto('/admin/plans');

    await expect(page).toHaveURL('/plans');
  });

  test('PLAN-09 admin can access /admin/plans and sees the plans table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Membership Plans' })).toBeVisible();
  });

  test('PLAN-10 admin creates a new plan and it appears in the admin table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    const planRequest = buildPlanRequest({
      name: uniquePlanName('Create'),
      description: 'Automated E2E test plan description.',
      priceInCents: 2999,
      durationDays: 30,
    });

    await page.getByRole('button', { name: 'New Plan' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await fillPlanForm(page, planRequest);
    await page.getByRole('button', { name: 'Save Plan' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(planRequest.name)).toBeVisible();
  });

  test('PLAN-11 admin edits a plan and the table row updates immediately', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const createdPlan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Edit Source'),
      description: 'Original plan description.',
      priceInCents: 4100,
      durationDays: 30,
    });

    const updatedPlan = buildPlanRequest({
      name: uniquePlanName('Edited'),
      description: 'Updated plan description.',
      priceInCents: 5500,
      durationDays: 60,
    });

    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await rowForPlan(page, createdPlan.name).getByRole('button', { name: `Edit ${createdPlan.name}` }).click();
    await expect(page.getByRole('heading', { name: 'Edit Plan' })).toBeVisible();

    await fillPlanForm(page, updatedPlan);
    await page.getByRole('button', { name: 'Save Plan' }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(rowForPlan(page, updatedPlan.name)).toBeVisible();
    await expect(rowForPlan(page, updatedPlan.name)).toContainText('$55.00');
    await expect(rowForPlan(page, updatedPlan.name)).toContainText('60 days');
  });

  test('PLAN-12 create and edit validation keep the modal open and show field errors', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const createdPlan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Validation Edit'),
    });

    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await page.getByRole('button', { name: 'New Plan' }).click();
    await expect(page.getByRole('heading', { name: 'New Plan' })).toBeVisible();

    await page.fill('#plan-name', '');
    await page.fill('#plan-description', '');
    await page.fill('#plan-price', '0');
    await page.fill('#plan-duration', '0');
    await page.getByRole('button', { name: 'Save Plan' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#plan-name-error')).toContainText('Plan name must not be blank.');
    await expect(page.locator('#plan-description-error')).toContainText('Description must not be blank.');
    await expect(page.locator('#plan-price-error')).toContainText('Price must be greater than zero.');
    await expect(page.locator('#plan-duration-error')).toContainText('Duration must be at least one day.');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await rowForPlan(page, createdPlan.name).getByRole('button', { name: `Edit ${createdPlan.name}` }).click();
    await expect(page.getByRole('heading', { name: 'Edit Plan' })).toBeVisible();

    await page.fill('#plan-name', '');
    await page.fill('#plan-description', '');
    await page.fill('#plan-price', '0');
    await page.fill('#plan-duration', '0');
    await page.getByRole('button', { name: 'Save Plan' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#plan-name-error')).toContainText('Plan name must not be blank.');
    await expect(page.locator('#plan-description-error')).toContainText('Description must not be blank.');
    await expect(page.locator('#plan-price-error')).toContainText('Price must be greater than zero.');
    await expect(page.locator('#plan-duration-error')).toContainText('Duration must be at least one day.');
  });

  test('PLAN-13 admin deactivates a plan and it disappears from the public catalog', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Deactivate'),
    });

    await loginAsAdmin(page);
    await page.goto('/admin/plans?status=ACTIVE');

    await rowForPlan(page, plan.name).getByRole('button', { name: `Deactivate ${plan.name}` }).click();
    const deactivateDialog = page.getByRole('dialog');
    await expect(deactivateDialog.getByRole('heading', { name: 'Deactivate Plan' })).toBeVisible();
    await deactivateDialog.getByRole('button', { name: 'Deactivate', exact: true }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(rowForPlan(page, plan.name)).toHaveCount(0);

    await page.goto('/plans');
    await expect(page.getByRole('link', { name: `View details for ${plan.name}` })).toHaveCount(0);
  });

  test('PLAN-14 admin reactivates a plan and it appears in the public catalog', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Reactivate'),
    });

    await deactivatePlanApi(request, adminToken, plan.id);

    await loginAsAdmin(page);
    await page.goto('/admin/plans?status=INACTIVE');

    await rowForPlan(page, plan.name).getByRole('button', { name: `Activate ${plan.name}` }).click();
    const activateDialog = page.getByRole('dialog');
    await expect(activateDialog.getByRole('heading', { name: 'Reactivate Plan' })).toBeVisible();
    await activateDialog.getByRole('button', { name: 'Activate', exact: true }).click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(rowForPlan(page, plan.name)).toHaveCount(0);

    await page.goto('/plans');
    await expect(page.getByRole('link', { name: `View details for ${plan.name}` })).toBeVisible();
  });

  test('PLAN-15 status conflicts show an error and leave the plan state unchanged', async ({ page }) => {
    const activePlan = mockPlan(201, 'ACTIVE', 'PLAN-15 Active');
    const inactivePlan = mockPlan(202, 'INACTIVE', 'PLAN-15 Inactive');

    await page.route('**/api/v1/admin/membership-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(paginatedPlans([activePlan, inactivePlan], 0, 20, 2)),
      });
    });

    await page.route(`**/api/v1/membership-plans/${activePlan.id}/deactivate`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Plan with id already inactive',
          code: 'PLAN_ALREADY_INACTIVE',
        }),
      });
    });

    await page.route(`**/api/v1/membership-plans/${inactivePlan.id}/activate`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Plan with id already active',
          code: 'PLAN_ALREADY_ACTIVE',
        }),
      });
    });

    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await rowForPlan(page, activePlan.name).getByRole('button', { name: `Deactivate ${activePlan.name}` }).click();
    const deactivateDialog = page.getByRole('dialog');
    await deactivateDialog.getByRole('button', { name: 'Deactivate', exact: true }).click();
    await expect(deactivateDialog.getByRole('alert')).toContainText('This plan is already inactive.');
    await expect(rowForPlan(page, activePlan.name).getByLabel('Status: Active')).toBeVisible();
    await deactivateDialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await rowForPlan(page, inactivePlan.name).getByRole('button', { name: `Activate ${inactivePlan.name}` }).click();
    const activateDialog = page.getByRole('dialog');
    await activateDialog.getByRole('button', { name: 'Activate', exact: true }).click();
    await expect(activateDialog.getByRole('alert')).toContainText('This plan is already active.');
    await expect(rowForPlan(page, inactivePlan.name).getByLabel('Status: Inactive')).toBeVisible();
  });

  test('PLAN-16 admin status tabs filter the table and keep the URL query param in sync', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const activePlan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Tab Active'),
    });
    const inactivePlan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Tab Inactive'),
    });

    await deactivatePlanApi(request, adminToken, inactivePlan.id);

    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await expect(rowForPlan(page, activePlan.name)).toBeVisible();
    await expect(rowForPlan(page, inactivePlan.name)).toBeVisible();

    await page.getByRole('tab', { name: 'Active', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/plans\?status=ACTIVE$/);
    await expect(rowForPlan(page, activePlan.name)).toBeVisible();
    await expect(rowForPlan(page, inactivePlan.name)).toHaveCount(0);

    await page.getByRole('tab', { name: 'Inactive', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/plans\?status=INACTIVE$/);
    await expect(rowForPlan(page, inactivePlan.name)).toBeVisible();
    await expect(rowForPlan(page, activePlan.name)).toHaveCount(0);

    await page.getByRole('tab', { name: 'All', exact: true }).click();
    await expect(page).toHaveURL('/admin/plans');
    await expect(rowForPlan(page, activePlan.name)).toBeVisible();
    await expect(rowForPlan(page, inactivePlan.name)).toBeVisible();
  });

  test('PLAN-17 admin pagination changes the visible rows and page indicator', async ({ page }) => {
    const firstPagePlans = Array.from({ length: 20 }, (_, index) => mockPlan(index + 301, 'ACTIVE', 'PLAN-17 Page One'));
    const secondPagePlans = [mockPlan(401, 'ACTIVE', 'PLAN-17 Page Two')];

    await page.route('**/api/v1/admin/membership-plans**', async (route) => {
      const url = new URL(route.request().url());
      const requestedPage = Number(url.searchParams.get('page') ?? '0');

      const payload = requestedPage === 1
        ? paginatedPlans(secondPagePlans, 1, 20, 21)
        : paginatedPlans(firstPagePlans, 0, 20, 21);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(rowForPlan(page, 'PLAN-17 Page One 301')).toBeVisible();
    await expect(rowForPlan(page, 'PLAN-17 Page Two 401')).toHaveCount(0);

    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(rowForPlan(page, 'PLAN-17 Page Two 401')).toBeVisible();
    await expect(rowForPlan(page, 'PLAN-17 Page One 301')).toHaveCount(0);

    await page.getByRole('button', { name: 'Previous' }).click();

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(rowForPlan(page, 'PLAN-17 Page One 301')).toBeVisible();
  });

  test('PLAN-18 changing the price is blocked when the plan has active subscribers', async ({ page, request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Subscriber Guard'),
      priceInCents: 4200,
    });

    const userEmail = uniqueEmail('e2e-member');
    const userPassword = 'Member@1234';
    await registerUserApi(request, userEmail, userPassword);
    const userSession = await loginUserApi(request, userEmail, userPassword);

    const purchaseResponse = await request.post(`${API_BASE}/memberships`, {
      headers: { Authorization: `Bearer ${userSession.accessToken}` },
      data: { planId: plan.id },
    });
    expect(purchaseResponse.ok()).toBeTruthy();

    await loginAsAdmin(page);
    await page.goto('/admin/plans');

    await rowForPlan(page, plan.name).getByRole('button', { name: `Edit ${plan.name}` }).click();
    await expect(page.getByRole('heading', { name: 'Edit Plan' })).toBeVisible();

    await page.fill('#plan-price', '5200');
    await page.getByRole('button', { name: 'Save Plan' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText(
      'Cannot change the price while members are subscribed to this plan.'
    );
    await expect(rowForPlan(page, plan.name)).toContainText('$42.00');
  });

  // ---------------------------------------------------------------------------
  // PLAN-19 — AC20: updatedAt changes after PUT
  // Verifies the @PreUpdate callback on MembershipPlan.kt fires on a PUT.
  // ---------------------------------------------------------------------------
  test('PLAN-19 AC20: updatedAt is updated after editing a plan via PUT', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const created = await createPlanApi(request, adminToken, {
      name: uniquePlanName('UpdatedAt Check'),
      description: 'Original description for updatedAt test.',
      priceInCents: 2500,
      durationDays: 14,
    });

    // Introduce a small delay so updatedAt can be strictly after createdAt even
    // if the DB timestamp resolution is one second.
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const putResponse = await request.put(`${API_BASE}/membership-plans/${created.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        name: uniquePlanName('UpdatedAt Changed'),
        description: 'Updated description for updatedAt test.',
        priceInCents: 2500,
        durationDays: 14,
      },
    });

    expect(putResponse.ok()).toBeTruthy();
    const putBody = await putResponse.json() as MembershipPlan;

    // The PUT response itself must show updatedAt strictly after createdAt.
    expect(new Date(putBody.updatedAt).getTime()).toBeGreaterThan(
      new Date(putBody.createdAt).getTime()
    );

    // Confirm via a fresh GET that the persisted updatedAt is also after createdAt.
    // Uses the public GET /{id} endpoint — there is no admin GET-by-ID endpoint.
    const getResponse = await request.get(`${API_BASE}/membership-plans/${created.id}`);
    expect(getResponse.ok()).toBeTruthy();
    const getBody = await getResponse.json() as MembershipPlan;

    expect(new Date(getBody.updatedAt).getTime()).toBeGreaterThan(
      new Date(getBody.createdAt).getTime()
    );
  });

  // ---------------------------------------------------------------------------
  // PLAN-20 — AC19: Deactivating a plan does NOT alter existing UserMembership records
  // ---------------------------------------------------------------------------
  test('PLAN-20 AC19: deactivating a plan leaves existing UserMembership records intact', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken, {
      name: uniquePlanName('Deactivate Membership Guard'),
    });

    // Subscribe a user to the plan.
    const userEmail = uniqueEmail('e2e-deact-guard');
    const userPassword = 'Member@1234';
    await registerUserApi(request, userEmail, userPassword);
    const userSession = await loginUserApi(request, userEmail, userPassword);

    const purchaseResponse = await request.post(`${API_BASE}/memberships`, {
      headers: { Authorization: `Bearer ${userSession.accessToken}` },
      data: { planId: plan.id },
    });
    expect(purchaseResponse.ok()).toBeTruthy();
    const membership = await purchaseResponse.json() as { id: string; planId: string; status: string };

    // Deactivate the plan.
    await deactivatePlanApi(request, adminToken, plan.id);

    // Fetch the user's active membership via /me (the correct read endpoint).
    // GET /memberships/{id} does not exist — /me returns the user's active membership.
    const membershipGetResponse = await request.get(`${API_BASE}/memberships/me`, {
      headers: { Authorization: `Bearer ${userSession.accessToken}` },
    });
    expect(membershipGetResponse.ok()).toBeTruthy();
    const membershipBody = await membershipGetResponse.json() as { id: string; planId: string; status: string };

    expect(membershipBody.status).toBe('ACTIVE');
    expect(membershipBody.planId).toBe(plan.id);
  });

  // ---------------------------------------------------------------------------
  // PLAN-21 — AC13: PUT to a non-existent plan ID returns 404 PLAN_NOT_FOUND
  // ---------------------------------------------------------------------------
  test('PLAN-21 AC13: PUT to a non-existent plan ID returns 404 PLAN_NOT_FOUND', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);

    const response = await request.put(`${API_BASE}/membership-plans/${NONEXISTENT_PLAN_ID}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: buildPlanRequest(),
    });

    expect(response.status()).toBe(404);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('PLAN_NOT_FOUND');
  });

  // ---------------------------------------------------------------------------
  // PLAN-22 — AC12: PUT validation returns same 400 error codes as POST
  // ---------------------------------------------------------------------------
  test('PLAN-22 AC12: PUT with blank name returns 400 INVALID_NAME', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken);

    const response = await request.put(`${API_BASE}/membership-plans/${plan.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: buildPlanRequest({ name: '   ' }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('INVALID_NAME');
  });

  test('PLAN-22 AC12: PUT with blank description returns 400 INVALID_DESCRIPTION', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken);

    const response = await request.put(`${API_BASE}/membership-plans/${plan.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: buildPlanRequest({ description: '   ' }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('INVALID_DESCRIPTION');
  });

  test('PLAN-22 AC12: PUT with priceInCents=0 returns 400 INVALID_PRICE', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken);

    const response = await request.put(`${API_BASE}/membership-plans/${plan.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: buildPlanRequest({ priceInCents: 0 }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('INVALID_PRICE');
  });

  test('PLAN-22 AC12: PUT with durationDays=0 returns 400 INVALID_DURATION', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const plan = await createPlanApi(request, adminToken);

    const response = await request.put(`${API_BASE}/membership-plans/${plan.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: buildPlanRequest({ durationDays: 0 }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('INVALID_DURATION');
  });

  // ---------------------------------------------------------------------------
  // PLAN-23 — AC21 sort: ?sort parameter respected on both list endpoints
  // ---------------------------------------------------------------------------
  test('PLAN-23 AC21: ?sort=name,asc and ?sort=name,desc respected on public list endpoint', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    // Create two plans whose names sort predictably. Prefix guarantees uniqueness
    // without interfering with pre-existing data because we only check order
    // within the result set — using sort on name and page=0&size=1000 to get all.
    const nameAlpha = `AAAAAA Sort Alpha ${Date.now()}`;
    const nameZeta  = `ZZZZZZ Sort Zeta  ${Date.now()}`;

    await createPlanApi(request, adminToken, { name: nameZeta,  description: 'sort zeta',  priceInCents: 1000, durationDays: 1 });
    await createPlanApi(request, adminToken, { name: nameAlpha, description: 'sort alpha', priceInCents: 1000, durationDays: 1 });

    // Ascending: AAAAAA should appear before ZZZZZZ in the response array.
    const ascResponse = await request.get(`${API_BASE}/membership-plans?sort=name,asc&size=1000`);
    expect(ascResponse.ok()).toBeTruthy();
    const ascBody = await ascResponse.json() as PaginatedPlans;
    const ascNames = ascBody.content.map((p) => p.name);
    expect(ascNames.indexOf(nameAlpha)).toBeLessThan(ascNames.indexOf(nameZeta));

    // Descending: ZZZZZZ should appear before AAAAAA in the response array.
    const descResponse = await request.get(`${API_BASE}/membership-plans?sort=name,desc&size=1000`);
    expect(descResponse.ok()).toBeTruthy();
    const descBody = await descResponse.json() as PaginatedPlans;
    const descNames = descBody.content.map((p) => p.name);
    expect(descNames.indexOf(nameZeta)).toBeLessThan(descNames.indexOf(nameAlpha));
  });

  test('PLAN-23 AC21: ?sort=name,asc and ?sort=name,desc respected on admin list endpoint', async ({ request }) => {
    const adminToken = await loginAsAdminApi(request);
    const nameAlpha = `AAAAAA Admin Sort Alpha ${Date.now()}`;
    const nameZeta  = `ZZZZZZ Admin Sort Zeta  ${Date.now()}`;

    await createPlanApi(request, adminToken, { name: nameZeta,  description: 'admin sort zeta',  priceInCents: 1000, durationDays: 1 });
    await createPlanApi(request, adminToken, { name: nameAlpha, description: 'admin sort alpha', priceInCents: 1000, durationDays: 1 });

    // Ascending.
    const ascResponse = await request.get(`${API_BASE}/admin/membership-plans?sort=name,asc&size=1000`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(ascResponse.ok()).toBeTruthy();
    const ascBody = await ascResponse.json() as PaginatedPlans;
    const ascNames = ascBody.content.map((p) => p.name);
    expect(ascNames.indexOf(nameAlpha)).toBeLessThan(ascNames.indexOf(nameZeta));

    // Descending.
    const descResponse = await request.get(`${API_BASE}/admin/membership-plans?sort=name,desc&size=1000`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(descResponse.ok()).toBeTruthy();
    const descBody = await descResponse.json() as PaginatedPlans;
    const descNames = descBody.content.map((p) => p.name);
    expect(descNames.indexOf(nameZeta)).toBeLessThan(descNames.indexOf(nameAlpha));
  });

  // ---------------------------------------------------------------------------
  // PLAN-24 — AC7 API-level 401/403 clarification
  //
  // AC7 says "403 without ADMIN JWT" but Spring returns 401 for a missing token
  // and 403 for a non-admin token. Both behaviours are correct and expected.
  // ---------------------------------------------------------------------------
  test('PLAN-24 AC7: POST without any JWT returns 401', async ({ request }) => {
    const response = await request.post(`${API_BASE}/membership-plans`, {
      data: buildPlanRequest(),
    });

    expect(response.status()).toBe(401);
  });

  test('PLAN-24 AC7: POST with a non-admin JWT returns 403 ACCESS_DENIED', async ({ request }) => {
    // Register and log in a plain user (no ADMIN role).
    const userEmail = uniqueEmail('e2e-nonadmin');
    const userPassword = 'Member@1234';
    await registerUserApi(request, userEmail, userPassword);
    const userSession = await loginUserApi(request, userEmail, userPassword);

    const response = await request.post(`${API_BASE}/membership-plans`, {
      headers: { Authorization: `Bearer ${userSession.accessToken}` },
      data: buildPlanRequest(),
    });

    expect(response.status()).toBe(403);
    const body = await response.json() as { code: string };
    expect(body.code).toBe('ACCESS_DENIED');
  });
});
