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

interface MembershipPlanSummary {
  id: string;
  name: string;
}

interface TrainerResponse {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassInstanceResponse {
  id: string;
  name: string;
  scheduledAt: string;
}

interface PaginatedResponse<T> {
  content: T[];
}

function uniqueValue(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueEmail(prefix: string): string {
  return `${uniqueValue(prefix)}@example.com`;
}

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as JwtPayload;
}

function buildPersistedAuthState(
  email: string,
  userToken: string,
  storedAccessToken: string,
  refreshToken: string
): PersistedAuthState {
  const payload = decodeJwtPayload(userToken);

  return {
    accessToken: storedAccessToken,
    refreshToken,
    user: {
      id: payload.sub,
      email,
      role: payload.role,
    },
    isAuthenticated: true,
  };
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
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

async function createUserSession(
  request: APIRequestContext,
  prefix = 'e2e-schedule-member'
): Promise<{ email: string; accessToken: string; refreshToken: string; userId: string }> {
  const email = uniqueEmail(prefix);
  await registerViaApi(request, email, USER_PASSWORD);
  const session = await loginViaApi(request, email, USER_PASSWORD);
  const payload = decodeJwtPayload(session.accessToken);

  return {
    email,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    userId: payload.sub,
  };
}

async function seedPersistedAuth(page: Page, state: PersistedAuthState): Promise<void> {
  await page.addInitScript((persistedState) => {
    window.localStorage.setItem(
      'gymflow-auth',
      JSON.stringify({ state: persistedState, version: 0 })
    );
  }, state);
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
): Promise<void> {
  const response = await request.post(`${API_BASE}/memberships`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { planId },
  });

  expect(response.ok()).toBeTruthy();
}

async function createTrainerViaApi(
  request: APIRequestContext,
  adminToken: string,
  firstName: string,
  lastName: string
): Promise<TrainerResponse> {
  const response = await request.post(`${API_BASE}/admin/trainers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      firstName,
      lastName,
      email: uniqueEmail('trainer'),
      specialisations: ['Yoga'],
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<TrainerResponse>;
}

async function createClassInstanceViaApi(
  request: APIRequestContext,
  adminToken: string,
  payload: {
    name: string;
    scheduledAt: string;
    durationMin: number;
    capacity: number;
    trainerIds: string[];
  }
): Promise<ClassInstanceResponse> {
  const response = await request.post(`${API_BASE}/admin/class-instances`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: {
      name: payload.name,
      scheduledAt: payload.scheduledAt,
      durationMin: payload.durationMin,
      capacity: payload.capacity,
      trainerIds: payload.trainerIds,
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<ClassInstanceResponse>;
}

async function deleteClassInstanceViaApi(
  request: APIRequestContext,
  adminToken: string,
  instanceId: string
): Promise<void> {
  const response = await request.delete(`${API_BASE}/admin/class-instances/${instanceId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  expect(response.ok()).toBeTruthy();
}

test('SCHED-01 redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/schedule');
  await expect(page).toHaveURL(/\/login/);
});

test('SCHED-02 active members can browse week, day, and list views', async ({ page, request }) => {
  const userSession = await createUserSession(request);
  const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const plan = await getFirstActivePlan(request);
  await purchaseMembershipViaApi(request, userSession.accessToken, plan.id);

  const trainerA = await createTrainerViaApi(request, adminSession.accessToken, 'Jamie', uniqueValue('Coach'));
  const trainerB = await createTrainerViaApi(request, adminSession.accessToken, 'Riley', uniqueValue('Coach'));

  const anchorDate = formatIsoDate(new Date());
  const nextDate = formatIsoDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const classOne = await createClassInstanceViaApi(request, adminSession.accessToken, {
    name: `Mobility ${uniqueValue('Flow')}`,
    scheduledAt: `${anchorDate}T09:00:00Z`,
    durationMin: 60,
    capacity: 12,
    trainerIds: [trainerA.id, trainerB.id],
  });

  const classTwo = await createClassInstanceViaApi(request, adminSession.accessToken, {
    name: `Core ${uniqueValue('Basics')}`,
    scheduledAt: `${nextDate}T10:00:00Z`,
    durationMin: 45,
    capacity: 10,
    trainerIds: [],
  });

  const persistedAuth = buildPersistedAuthState(
    userSession.email,
    userSession.accessToken,
    userSession.accessToken,
    userSession.refreshToken
  );
  await seedPersistedAuth(page, persistedAuth);

  await page.goto(`/schedule?view=week&date=${anchorDate}`);

  const classOneCard = page.getByRole('button', { name: new RegExp(classOne.name) }).first();
  const classTwoCard = page.getByRole('button', { name: new RegExp(classTwo.name) }).first();

  await expect(page.getByRole('heading', { name: 'Group Classes' })).toBeVisible();
  await expect(classOneCard).toBeVisible();
  await expect(classTwoCard).toBeVisible();
  await expect(classTwoCard.getByText('Trainer TBA')).toBeVisible();
  await expect(
    classOneCard.getByText(new RegExp(`${trainerA.firstName} ${trainerA.lastName}`))
  ).toBeVisible();

  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.getByText('Day agenda')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`view=day&date=${anchorDate}`));

  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByText('Upcoming 14 days')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`view=list&date=${anchorDate}`));

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/date=/);

  await deleteClassInstanceViaApi(request, adminSession.accessToken, classOne.id);
  await deleteClassInstanceViaApi(request, adminSession.accessToken, classTwo.id);
});

test('SCHED-03 members without active plans see the membership-required state', async ({ page, request }) => {
  const userSession = await createUserSession(request, 'e2e-schedule-noplan');

  const persistedAuth = buildPersistedAuthState(
    userSession.email,
    userSession.accessToken,
    userSession.accessToken,
    userSession.refreshToken
  );
  await seedPersistedAuth(page, persistedAuth);

  await page.goto('/schedule?view=week&date=2026-03-30');

  await expect(page.getByRole('heading', { name: 'Membership required' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse plans' })).toBeVisible();
});

test('SCHED-04 shows a retry state when the schedule fails to load', async ({ page, request }) => {
  const userSession = await createUserSession(request, 'e2e-schedule-error');
  const plan = await getFirstActivePlan(request);
  await purchaseMembershipViaApi(request, userSession.accessToken, plan.id);

  const persistedAuth = buildPersistedAuthState(
    userSession.email,
    userSession.accessToken,
    userSession.accessToken,
    userSession.refreshToken
  );
  await seedPersistedAuth(page, persistedAuth);

  await page.route('**/api/v1/class-schedule*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Server error', code: 'INTERNAL_ERROR' }),
    });
  });

  await page.goto('/schedule?view=week&date=2026-03-30');

  await expect(page.getByRole('heading', { name: 'Schedule unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry schedule' })).toBeVisible();
});

test('SCHED-05 stays readable on small screens without horizontal scroll', async ({ page, request }) => {
  await page.setViewportSize({ width: 360, height: 780 });

  const userSession = await createUserSession(request, 'e2e-schedule-mobile');
  const plan = await getFirstActivePlan(request);
  await purchaseMembershipViaApi(request, userSession.accessToken, plan.id);

  const persistedAuth = buildPersistedAuthState(
    userSession.email,
    userSession.accessToken,
    userSession.accessToken,
    userSession.refreshToken
  );
  await seedPersistedAuth(page, persistedAuth);

  await page.goto('/schedule?view=week&date=2026-03-30');
  await expect(page.getByRole('heading', { name: 'Group Classes' })).toBeVisible();

  const hasOverflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth;
  });

  expect(hasOverflow).toBe(false);
});
