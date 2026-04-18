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

interface TrainerResponse {
  id: string;
  firstName: string;
  lastName: string;
}

interface MembershipPlanSummary {
  id: string;
  name: string;
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
  adminToken: string
): Promise<TrainerResponse> {
  const payload = {
    firstName: 'Taylor',
    lastName: uniqueValue('Trainer'),
    email: uniqueEmail('trainer'),
    bio: 'Certified coach for strength and conditioning.',
    specialisations: ['Strength', 'HIIT'],
    experienceYears: 6,
  };

  const response = await request.post(`${API_BASE}/admin/trainers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<TrainerResponse>;
}

async function openTrainerProfileFromList(
  page: Page,
  trainerName: string
): Promise<void> {
  let currentPage = 1

  for (;;) {
    const trainerLink = page.getByRole('link', { name: trainerName });
    if (await trainerLink.count()) {
      await expect(trainerLink.first()).toBeVisible();
      await trainerLink.first().click();
      return;
    }

    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeVisible();
    if (await nextButton.isDisabled()) {
      throw new Error(`Trainer ${trainerName} was not found in discovery pagination`);
    }

    await nextButton.click();
    currentPage += 1
    await expect(page.getByText(new RegExp(`^Page ${currentPage} of \\d+$`))).toBeVisible();
  }
}

test.describe('Trainer Discovery', () => {
  test('TD-01 lists trainers and shows trainer profile', async ({ page, request }) => {
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const trainer = await createTrainerViaApi(request, adminSession.accessToken);

    const email = uniqueEmail('e2e-member');
    await registerViaApi(request, email, USER_PASSWORD);
    const userSession = await loginViaApi(request, email, USER_PASSWORD);
    const plan = await getFirstActivePlan(request);
    await purchaseMembershipViaApi(request, userSession.accessToken, plan.id);

    const persistedAuth = buildPersistedAuthState(
      email,
      userSession.accessToken,
      userSession.accessToken,
      userSession.refreshToken
    );

    await seedPersistedAuth(page, persistedAuth);

    await page.goto('/trainers');
    await expect(page.getByRole('heading', { name: 'Trainer Discovery' })).toBeVisible();
    await openTrainerProfileFromList(page, `${trainer.firstName} ${trainer.lastName}`);
    await expect(page).toHaveURL(new RegExp('/trainers/'));
    await expect(page.getByRole('heading', { name: `${trainer.firstName} ${trainer.lastName}` })).toBeVisible();
  });

  // TD-02: AC 18 — Duplicate favorite returns 409 ALREADY_FAVORITED
  // Fix: b3ecafc — replaced DataIntegrityViolationException catch with explicit existsByUserIdAndTrainerId check
  test('TD-02 duplicate favorite returns 409 ALREADY_FAVORITED', async ({ request }) => {
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const trainer = await createTrainerViaApi(request, adminSession.accessToken);

    const email = uniqueEmail('e2e-td02');
    await registerViaApi(request, email, USER_PASSWORD);
    const userSession = await loginViaApi(request, email, USER_PASSWORD);
    const plan = await getFirstActivePlan(request);
    await purchaseMembershipViaApi(request, userSession.accessToken, plan.id);

    const authHeader = { Authorization: `Bearer ${userSession.accessToken}` };

    // First save — must succeed with 201
    const firstResponse = await request.post(
      `${API_BASE}/trainers/${trainer.id}/favorites`,
      { headers: authHeader }
    );
    expect(firstResponse.status()).toBe(201);
    const firstBody = await firstResponse.json() as TrainerResponse;
    expect(firstBody.id ?? (firstBody as Record<string, unknown>)['trainerId']).toBeTruthy();

    // Second save of the same trainer — must return 409 ALREADY_FAVORITED
    const duplicateResponse = await request.post(
      `${API_BASE}/trainers/${trainer.id}/favorites`,
      { headers: authHeader }
    );
    expect(duplicateResponse.status()).toBe(409);
    const duplicateBody = await duplicateResponse.json() as { error: string; code: string };
    expect(duplicateBody.code).toBe('ALREADY_FAVORITED');
  });

});
