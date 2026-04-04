import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';
const USER_PASSWORD = 'Member@1234';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
}

interface MembershipPlanSummary {
  id: string;
  name: string;
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

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as JwtPayload;
}

function adminMembershipCancelButtons(page: Page) {
  return page.locator('tbody').getByRole('button', { name: 'Cancel', exact: true });
}

async function registerViaApi(
  request: APIRequestContext,
  email: string,
  password = USER_PASSWORD
): Promise<void> {
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
}

async function loginViaApi(
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

async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/plans');
}

async function loginAsAdminUi(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/admin/plans');
}

async function createUserSession(
  request: APIRequestContext,
  prefix = 'e2e-member'
): Promise<{ email: string; password: string; accessToken: string; refreshToken: string; userId: string }> {
  const email = uniqueEmail(prefix);
  await registerViaApi(request, email, USER_PASSWORD);
  const session = await loginViaApi(request, email, USER_PASSWORD);
  const payload = decodeJwtPayload(session.accessToken);

  return {
    email,
    password: USER_PASSWORD,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userId: payload.sub,
  };
}

async function getFirstActivePlan(request: APIRequestContext): Promise<MembershipPlanSummary> {
  const response = await request.get(`${API_BASE}/membership-plans?page=0&size=20`);
  expect(response.ok()).toBeTruthy();

  const data = await response.json() as PaginatedResponse<MembershipPlanSummary>;
  expect(data.content.length).toBeGreaterThan(0);
  return data.content[0];
}

async function purchaseMembershipViaApi(
  request: APIRequestContext,
  accessToken: string,
  planId: string
): Promise<UserMembership> {
  const response = await request.post(`${API_BASE}/memberships`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { planId },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<UserMembership>;
}

async function cancelMembershipViaApi(
  request: APIRequestContext,
  accessToken: string
): Promise<UserMembership> {
  const response = await request.delete(`${API_BASE}/memberships/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<UserMembership>;
}

async function deactivatePlanViaApi(
  request: APIRequestContext,
  adminAccessToken: string,
  planId: string
): Promise<void> {
  const response = await request.patch(`${API_BASE}/membership-plans/${planId}/deactivate`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });

  expect(response.ok()).toBeTruthy();
}

async function activatePlanViaApi(
  request: APIRequestContext,
  adminAccessToken: string,
  planId: string
): Promise<void> {
  const response = await request.patch(`${API_BASE}/membership-plans/${planId}/activate`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });

  expect(response.ok()).toBeTruthy();
}

async function fetchAdminMembershipsViaApi(
  request: APIRequestContext,
  adminAccessToken: string,
  params: { status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'; userId?: string; page?: number; size?: number } = {}
): Promise<PaginatedResponse<UserMembership>> {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set('status', params.status);
  }
  if (params.userId) {
    searchParams.set('userId', params.userId);
  }
  searchParams.set('page', String(params.page ?? 0));
  searchParams.set('size', String(params.size ?? 20));
  searchParams.set('sort', 'createdAt,desc');

  const response = await request.get(`${API_BASE}/admin/memberships?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<PaginatedResponse<UserMembership>>;
}

async function adminCancelMembershipViaApi(
  request: APIRequestContext,
  adminAccessToken: string,
  membershipId: string
): Promise<UserMembership> {
  const response = await request.delete(`${API_BASE}/admin/memberships/${membershipId}`, {
    headers: { Authorization: `Bearer ${adminAccessToken}` },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<UserMembership>;
}

async function createActiveMembership(
  request: APIRequestContext,
  prefix = 'e2e-member'
): Promise<{
  email: string;
  password: string;
  userId: string;
  accessToken: string;
  plan: MembershipPlanSummary;
  membership: UserMembership;
}> {
  const user = await createUserSession(request, prefix);
  const plan = await getFirstActivePlan(request);
  const membership = await purchaseMembershipViaApi(request, user.accessToken, plan.id);

  return {
    email: user.email,
    password: user.password,
    userId: user.userId,
    accessToken: user.accessToken,
    plan,
    membership,
  };
}

async function createMembershipHistory(
  request: APIRequestContext
): Promise<{
  email: string;
  password: string;
  userId: string;
  accessToken: string;
  plan: MembershipPlanSummary;
  cancelledMembership: UserMembership;
  activeMembership: UserMembership;
}> {
  const user = await createUserSession(request, 'e2e-member');
  const plan = await getFirstActivePlan(request);
  const firstMembership = await purchaseMembershipViaApi(request, user.accessToken, plan.id);
  await cancelMembershipViaApi(request, user.accessToken);
  const secondMembership = await purchaseMembershipViaApi(request, user.accessToken, plan.id);

  return {
    email: user.email,
    password: user.password,
    userId: user.userId,
    accessToken: user.accessToken,
    plan,
    cancelledMembership: { ...firstMembership, status: 'CANCELLED' },
    activeMembership: secondMembership,
  };
}

async function openFirstPurchaseModal(page: Page): Promise<{ planId: string; planName: string }> {
  await page.goto('/plans');
  const firstCard = page.getByRole('link', { name: /^View details for / }).first();
  await expect(firstCard).toBeVisible();

  const ariaLabel = await firstCard.getAttribute('aria-label');
  const href = await firstCard.getAttribute('href');

  expect(ariaLabel).toBeTruthy();
  expect(href).toBeTruthy();

  await expect(page.getByRole('button', { name: 'Activate' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Activate' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Activate plan?' })).toBeVisible();

  return {
    planId: href!.split('/').pop()!,
    planName: ariaLabel!.replace('View details for ', ''),
  };
}

async function purchaseFirstPlanViaUi(page: Page): Promise<{ planId: string; planName: string }> {
  const selectedPlan = await openFirstPurchaseModal(page);
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page).toHaveURL('/membership');
  return selectedPlan;
}

async function expectNoActiveMembership(page: Page): Promise<void> {
  await expect(page.getByText('No active membership')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse plans' })).toBeVisible();
}

async function waitForAdminMembershipsRequest(page: Page): Promise<void> {
  await page.waitForResponse((response) =>
    response.url().includes('/api/v1/admin/memberships') &&
    response.request().method() === 'GET'
  );
}

async function waitForAdminMembershipsPageRequest(page: Page, pageNumber: number): Promise<void> {
  await page.waitForResponse((response) => {
    if (!response.url().includes('/api/v1/admin/memberships')) {
      return false;
    }

    if (response.request().method() !== 'GET') {
      return false;
    }

    const url = new URL(response.url());
    return url.searchParams.get('page') === String(pageNumber);
  });
}

async function setAdminUserIdFilter(page: Page, userId: string): Promise<void> {
  const responsePromise = waitForAdminMembershipsRequest(page);
  await page.fill('#user-id-filter', userId);
  await responsePromise;
}

async function setAdminStatusFilter(
  page: Page,
  status: '' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
): Promise<void> {
  const responsePromise = waitForAdminMembershipsRequest(page);
  await page.selectOption('#status-filter', status);
  await responsePromise;
}

test.describe('User Membership Purchase', () => {
  test('MEM-01 purchases a membership from the plans page', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    const selectedPlan = await purchaseFirstPlanViaUi(page);

    await expect(page.getByRole('heading', { name: 'My Membership' })).toBeVisible();
    await expect(page.getByRole('heading', { name: selectedPlan.planName })).toBeVisible();
    await expect(page.getByLabel('Status: Active')).toBeVisible();
  });

  test('MEM-02 dismisses the purchase modal with the Cancel button without creating a membership', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    await openFirstPurchaseModal(page);
    await page.getByRole('dialog', { name: 'Activate plan?' }).getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog', { name: 'Activate plan?' })).not.toBeVisible();
    await expect(page).toHaveURL('/plans');

    await page.goto('/membership');
    await expectNoActiveMembership(page);
  });

  test('MEM-03 dismisses the purchase modal via overlay click and Escape without creating a membership', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    await openFirstPurchaseModal(page);
    await page.getByRole('dialog', { name: 'Activate plan?' }).click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole('dialog', { name: 'Activate plan?' })).not.toBeVisible();

    await openFirstPurchaseModal(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Activate plan?' })).not.toBeVisible();

    await page.goto('/membership');
    await expectNoActiveMembership(page);
  });

  test('MEM-04 shows Activate CTAs only for an authenticated user without an active membership', async ({ page, request }) => {
    await page.goto('/plans');
    await expect(page.getByRole('button', { name: 'Activate' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Get Started' }).first()).toBeVisible();

    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    await expect(page.getByRole('button', { name: 'Activate' }).first()).toBeVisible();

    await purchaseFirstPlanViaUi(page);
    await page.goto('/plans');

    await expect(page.getByRole('button', { name: 'Activate' })).toHaveCount(0);
  });

  test('MEM-05 renders active membership details on /membership', async ({ page, request }) => {
    const membershipData = await createActiveMembership(request);
    await loginViaUi(page, membershipData.email, membershipData.password);

    await page.goto('/membership');

    await expect(page.getByRole('heading', { name: 'My Membership' })).toBeVisible();
    await expect(page.getByRole('heading', { name: membershipData.plan.name })).toBeVisible();
    await expect(page.getByLabel('Status: Active')).toBeVisible();
    await expect(page.getByText('Start date')).toBeVisible();
    await expect(page.getByText('End date')).toBeVisible();
    await expect(page.getByText('Bookings this month')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Bookings used this month' })).toHaveAttribute('aria-valuenow', '0');
  });

  test('MEM-06 shows the empty-state card when the user has no active membership', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    await page.goto('/membership');
    await expectNoActiveMembership(page);
  });

  test('MEM-07 navigates from the empty-state CTA back to /plans', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    await page.goto('/membership');
    await page.getByRole('link', { name: 'Browse plans' }).click();

    await expect(page).toHaveURL('/plans');
    await expect(page.getByRole('heading', { name: 'Membership Plans' })).toBeVisible();
  });

  test('MEM-08 shows the membership fetch error state and recovers on Retry', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    let failedOnce = false;
    await page.route('**/api/v1/memberships/me', async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error', code: 'INTERNAL_ERROR' }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/membership');
    await expect(page.getByText('Something went wrong')).toBeVisible();
    await expect(page.getByText('Unable to load your membership. Please try again.')).toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();
    await expectNoActiveMembership(page);
  });

  test('MEM-09 cancels an active membership and shows the empty state afterwards', async ({ page, request }) => {
    const membershipData = await createActiveMembership(request);
    await loginViaUi(page, membershipData.email, membershipData.password);

    await page.goto('/membership');
    await page.getByRole('button', { name: 'Cancel membership' }).click();
    await page.getByRole('dialog', { name: 'Cancel membership?' }).getByRole('button', { name: 'Cancel membership' }).click();

    await expectNoActiveMembership(page);
  });

  test('MEM-10 dismisses the cancel modal without cancelling the membership', async ({ page, request }) => {
    const membershipData = await createActiveMembership(request);
    await loginViaUi(page, membershipData.email, membershipData.password);

    await page.goto('/membership');
    await page.getByRole('button', { name: 'Cancel membership' }).click();
    await page.getByRole('button', { name: 'Keep membership' }).click();

    await expect(page.getByRole('dialog', { name: 'Cancel membership?' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel membership' })).toBeVisible();
    await expect(page.getByLabel('Status: Active')).toBeVisible();
  });

  test('MEM-11 allows a user to purchase another membership after cancelling the previous one', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    const firstSelection = await purchaseFirstPlanViaUi(page);
    await page.getByRole('button', { name: 'Cancel membership' }).click();
    await page.getByRole('dialog', { name: 'Cancel membership?' }).getByRole('button', { name: 'Cancel membership' }).click();

    await expectNoActiveMembership(page);

    await purchaseFirstPlanViaUi(page);
    await expect(page.getByRole('heading', { name: firstSelection.planName })).toBeVisible();
    await expect(page.getByLabel('Status: Active')).toBeVisible();
  });

  test('MEM-12 blocks purchase when the plan becomes inactive before confirmation', async ({ page, request }) => {
    const user = await createUserSession(request);
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await loginViaUi(page, user.email, user.password);

    const selectedPlan = await openFirstPurchaseModal(page);

    try {
      await deactivatePlanViaApi(request, adminSession.accessToken, selectedPlan.planId);
      await page.getByRole('button', { name: 'Confirm' }).click();

      await expect(page.getByRole('alert')).toContainText('This plan is no longer available for purchase.');
      await expect(page.getByRole('dialog', { name: 'Activate plan?' })).toBeVisible();
      await page.goto('/membership');
      await expectNoActiveMembership(page);
    } finally {
      await activatePlanViaApi(request, adminSession.accessToken, selectedPlan.planId);
    }
  });

  test('MEM-13 blocks a duplicate purchase when the user gains an active membership before confirmation', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    const selectedPlan = await openFirstPurchaseModal(page);
    await purchaseMembershipViaApi(request, user.accessToken, selectedPlan.planId);

    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'You already have an active membership. Please cancel it before activating a new one.'
    );
    await expect(page.getByRole('dialog', { name: 'Activate plan?' })).toBeVisible();

    await page.goto('/membership');
    await expect(page.getByRole('heading', { name: selectedPlan.planName })).toBeVisible();
    await expect(page.getByLabel('Status: Active')).toBeVisible();
  });

  test('MEM-14 redirects an unauthenticated visitor from /membership to /login', async ({ page }) => {
    await page.goto('/membership');
    await expect(page).toHaveURL('/login');
  });

  test('MEM-15 loads the admin memberships page for an admin user', async ({ page }) => {
    await loginAsAdminUi(page);
    await page.goto('/admin/memberships');

    await expect(page.getByRole('heading', { name: 'Memberships' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('MEM-16 redirects a non-admin user away from /admin/memberships', async ({ page, request }) => {
    const user = await createUserSession(request);
    await loginViaUi(page, user.email, user.password);

    await page.goto('/admin/memberships');
    await expect(page).toHaveURL('/plans');
  });

  test('MEM-17 redirects a guest away from /admin/memberships', async ({ page }) => {
    await page.goto('/admin/memberships');
    await expect(page).toHaveURL('/plans');
  });

  test('MEM-18 filters the admin memberships table by status', async ({ page, request }) => {
    const history = await createMembershipHistory(request);
    await loginAsAdminUi(page);

    await page.goto('/admin/memberships');
    await setAdminUserIdFilter(page, history.userId);

    await expect(page.getByText('2 total')).toBeVisible();

    await setAdminStatusFilter(page, 'ACTIVE');
    await expect(page.getByText('1 total')).toBeVisible();
    await expect(page.getByLabel('Status: Active')).toHaveCount(1);
    await expect(page.getByLabel('Status: Cancelled')).toHaveCount(0);
    await expect(adminMembershipCancelButtons(page)).toHaveCount(1);

    await setAdminStatusFilter(page, 'CANCELLED');
    await expect(page.getByText('1 total')).toBeVisible();
    await expect(page.getByLabel('Status: Cancelled')).toHaveCount(1);
    await expect(page.getByLabel('Status: Active')).toHaveCount(0);
    await expect(adminMembershipCancelButtons(page)).toHaveCount(0);
  });

  test('MEM-19 narrows the admin memberships table to a matching user ID', async ({ page, request }) => {
    const history = await createMembershipHistory(request);
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const expected = await fetchAdminMembershipsViaApi(request, adminSession.accessToken, {
      userId: history.userId,
      size: 20,
    });

    await loginAsAdminUi(page);
    await page.goto('/admin/memberships');
    await setAdminUserIdFilter(page, history.userId);

    await expect(page.getByText(`${expected.totalElements} total`)).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: history.plan.name })).toHaveCount(expected.totalElements);
  });

  test('MEM-20 shows the empty state when the admin user ID filter has no matches', async ({ page }) => {
    await loginAsAdminUi(page);
    await page.goto('/admin/memberships');

    await setAdminUserIdFilter(page, '00000000-0000-0000-0000-000000000000');
    await expect(page.getByText('No memberships found')).toBeVisible();
  });

  test('MEM-21 paginates the admin memberships table when more than 20 records exist', async ({ page, request }) => {
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const plan = await getFirstActivePlan(request);

    for (let index = 0; index < 21; index += 1) {
      const user = await createUserSession(request, 'e2e-member-page');
      await purchaseMembershipViaApi(request, user.accessToken, plan.id);
    }

    const firstPage = await fetchAdminMembershipsViaApi(request, adminSession.accessToken, { size: 20 });
    expect(firstPage.totalPages).toBeGreaterThan(1);

    await loginAsAdminUi(page);
    await page.goto('/admin/memberships');

    await expect(page.getByText(`Page 1 of ${firstPage.totalPages}`)).toBeVisible();

    const firstRowUserId = await page.locator('tbody tr').first().locator('td').first().innerText();
    const responsePromise = waitForAdminMembershipsPageRequest(page, 1);
    await page.getByRole('button', { name: 'Next' }).click();
    await responsePromise;

    await expect(page.getByText(`Page 2 of ${firstPage.totalPages}`)).toBeVisible();
    await expect(page.locator('tbody tr').first().locator('td').first()).not.toHaveText(firstRowUserId);
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  test('MEM-22 lets an admin cancel an active membership', async ({ page, request }) => {
    const membershipData = await createActiveMembership(request);
    await loginAsAdminUi(page);

    await page.goto('/admin/memberships');
    await setAdminUserIdFilter(page, membershipData.userId);
    await setAdminStatusFilter(page, 'ACTIVE');

    await expect(page.getByLabel('Status: Active')).toHaveCount(1);
    await adminMembershipCancelButtons(page).click();
    await page.getByRole('dialog', { name: 'Cancel this membership?' }).getByRole('button', { name: 'Confirm cancel' }).click();

    await expect(page.getByRole('dialog', { name: 'Cancel this membership?' })).not.toBeVisible();
    await expect(page.getByText('No memberships found')).toBeVisible();
  });

  test('MEM-23 shows MEMBERSHIP_NOT_ACTIVE when an admin tries to cancel a membership that was already cancelled elsewhere', async ({ page, request }) => {
    const membershipData = await createActiveMembership(request);
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await loginAsAdminUi(page);

    await page.goto('/admin/memberships');
    await setAdminUserIdFilter(page, membershipData.userId);
    await setAdminStatusFilter(page, 'ACTIVE');
    await expect(page.getByText('1 total')).toBeVisible();
    await expect(adminMembershipCancelButtons(page)).toHaveCount(1);

    await adminMembershipCancelButtons(page).click();
    await expect(page.getByRole('dialog', { name: 'Cancel this membership?' })).toBeVisible();

    await adminCancelMembershipViaApi(request, adminSession.accessToken, membershipData.membership.id);
    await page.getByRole('button', { name: 'Confirm cancel' }).click();

    await expect(page.getByRole('alert')).toContainText('This membership is already cancelled or expired.');
    await expect(page.getByRole('dialog', { name: 'Cancel this membership?' })).toBeVisible();
  });
});
