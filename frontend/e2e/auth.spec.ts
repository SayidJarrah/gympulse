import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@gymflow.local';
// PRODUCTION NOTE: set E2E_ADMIN_PASSWORD env var; the default here is for local dev only.
// Rotate the seed password before provisioning any non-local environment.
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@1234';

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

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
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
  password: string
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

async function registerViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/register');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

async function seedPersistedAuth(page: Page, state: PersistedAuthState): Promise<void> {
  await page.addInitScript((persistedState) => {
    window.localStorage.setItem(
      'gymflow-auth',
      JSON.stringify({ state: persistedState, version: 0 })
    );
  }, state);
}

async function readPersistedAuth(page: Page): Promise<PersistedAuthState> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('gymflow-auth');
    return JSON.parse(raw ?? '{"state":null}').state as PersistedAuthState;
  });
}

test.describe('Auth', () => {
  test('AUTH-01 registers with valid data and redirects to login', async ({ page }) => {
    await registerViaUi(page, uniqueEmail('e2e-register'), 'TestPass1');

    await expect(page).toHaveURL('/login');
  });

  test('AUTH-02 shows a duplicate-account error for an existing email', async ({ page, request }) => {
    const email = uniqueEmail('e2e-register');
    const password = 'TestPass1';

    await registerViaApi(request, email, password);
    await registerViaUi(page, email, password);

    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('alert')).toContainText(
      'An account with this email already exists. Please sign in instead.'
    );
  });

  test('AUTH-03 shows registration validation errors for malformed email and invalid password length', async ({ page }) => {
    await page.goto('/register');

    await page.fill('#email', 'not-an-email');
    await page.fill('#password', 'ValidPass1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('#email-error')).toContainText('Please enter a valid email address.');
    await expect(page).toHaveURL('/register');

    await page.fill('#email', uniqueEmail('e2e-register'));
    await page.fill('#password', 'short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('#password-error')).toContainText('Password must be at least 8 characters.');
    await expect(page).toHaveURL('/register');

    await page.fill('#password', 'PasswordLength16');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.locator('#password-error')).toContainText('Password must be at most 15 characters.');
    await expect(page).toHaveURL('/register');
  });

  test('AUTH-04 logs in a regular user, redirects to /plans, and shows authenticated navbar state', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member');
    const password = 'Member@1234';

    await registerViaApi(request, email, password);
    await loginViaUi(page, email, password);

    await expect(page).toHaveURL('/plans');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(page.getByLabel('User menu')).toBeVisible();
  });

  test('AUTH-05 logs in an admin and redirects to /admin/plans', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await expect(page).toHaveURL('/admin/plans');
  });

  test('AUTH-06 shows a generic invalid-credentials error for the wrong password', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, 'wrongpassword');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('alert')).toContainText('Incorrect email or password');
  });

  test('AUTH-07 shows the same generic invalid-credentials error for an unknown email', async ({ page }) => {
    await loginViaUi(page, uniqueEmail('e2e-unknown'), 'WrongPass1');

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('alert')).toContainText('Incorrect email or password');
  });

  test('AUTH-08 logs a regular user out from the public navbar and restores guest access rules', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member');
    const password = 'Member@1234';

    await registerViaApi(request, email, password);
    await loginViaUi(page, email, password);
    await expect(page).toHaveURL('/plans');

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/login');

    await page.goto('/membership');
    await expect(page).toHaveURL('/login');

    await page.goto('/plans');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('AUTH-09 logs an admin out from the sidebar and blocks admin routes afterwards', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL('/admin/plans');

    await page.getByRole('button', { name: 'Log out' }).click();

    await expect(page).toHaveURL('/login');

    await page.goto('/admin/plans');
    await expect(page).toHaveURL('/plans');
  });

  test('AUTH-10 redirects an unauthenticated guest from /membership to /login', async ({ page }) => {
    await page.goto('/membership');

    await expect(page).toHaveURL('/login');
  });

  test('AUTH-11 redirects an unauthenticated guest from /admin/plans to /plans', async ({ page }) => {
    await page.goto('/admin/plans');

    await expect(page).toHaveURL('/plans');
  });

  test('AUTH-12 redirects an authenticated non-admin away from /admin/plans', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member');
    const password = 'Member@1234';

    await registerViaApi(request, email, password);
    await loginViaUi(page, email, password);
    await expect(page).toHaveURL('/plans');

    await page.goto('/admin/plans');

    await expect(page).toHaveURL('/plans');
  });

  test('AUTH-13 silently refreshes an expired access token and keeps the user in-app', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member');
    const password = 'Member@1234';

    await registerViaApi(request, email, password);
    const session = await loginViaApi(request, email, password);

    await seedPersistedAuth(
      page,
      buildPersistedAuthState(email, session.accessToken, 'expired-access-token', session.refreshToken)
    );

    const refreshResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/auth/refresh') &&
      response.request().method() === 'POST'
    );

    await page.goto('/membership');

    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.status()).toBe(200);

    const refreshedTokens = (await refreshResponse.json()) as LoginResponse;

    await expect(page).toHaveURL('/membership');
    await expect(page.getByText('No active membership')).toBeVisible();

    const persistedAuth = await readPersistedAuth(page);
    expect(persistedAuth.accessToken).toBe(refreshedTokens.accessToken);
    expect(persistedAuth.refreshToken).toBe(refreshedTokens.refreshToken);
    expect(persistedAuth.refreshToken).not.toBe(session.refreshToken);
  });

  // -----------------------------------------------------------------------
  // API-level tests: AC-2, AC-6, AC-8/9, AC-15/17, AC-19/20, AC-21, AC-24/25
  // -----------------------------------------------------------------------

  test('AUTH-API-01 (AC-2) register 201 response shape — role is always USER', async ({ request }) => {
    const email = uniqueEmail('e2e-api-ac2');
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'ValidPass1' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json() as {
      id: string;
      email: string;
      role: string;
      createdAt: string;
    };
    expect(typeof body.id).toBe('string');
    expect(body.email).toBe(email);
    expect(body.role).toBe('USER');
    expect(typeof body.createdAt).toBe('string');
    // createdAt must be ISO 8601
    expect(() => new Date(body.createdAt)).not.toThrow();
  });

  test('AUTH-API-02 (AC-6) role field in register body is silently ignored', async ({ request }) => {
    const email = uniqueEmail('e2e-api-ac6');
    const response = await request.post(`${API_BASE}/auth/register`, {
      data: { email, password: 'ValidPass1', role: 'ADMIN' },
    });

    expect(response.status()).toBe(201);
    const body = await response.json() as { role: string };
    expect(body.role).toBe('USER');
  });

  test('AUTH-API-03 (AC-8/9) login response field types and JWT claims are correct', async ({ request }) => {
    const email = uniqueEmail('e2e-api-ac8');
    const password = 'ValidPass1';

    await request.post(`${API_BASE}/auth/register`, { data: { email, password } });
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password },
    });

    expect(loginResponse.status()).toBe(200);
    const body = await loginResponse.json() as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
    };

    // AC-9: response field types
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    expect(body.tokenType).toBe('Bearer');
    expect(typeof body.expiresIn).toBe('number');
    expect(body.expiresIn).toBeGreaterThan(0);

    // AC-8: JWT claims
    const payload = decodeJwtPayload(body.accessToken);
    const fullPayload = payload as JwtPayload & { iat?: number; exp?: number };
    expect(typeof fullPayload.sub).toBe('string');
    expect(fullPayload.role).toBe('USER');
    expect(typeof fullPayload.iat).toBe('number');
    expect(typeof fullPayload.exp).toBe('number');
    // exp must be after iat
    expect((fullPayload.exp as number)).toBeGreaterThan((fullPayload.iat as number));
  });

  test('AUTH-API-04 (AC-15/17) token rotation — old refresh token is rejected after use', async ({ request }) => {
    const email = uniqueEmail('e2e-api-ac15');
    const password = 'ValidPass1';

    await request.post(`${API_BASE}/auth/register`, { data: { email, password } });
    const loginBody = await loginViaApi(request, email, password);

    // AC-15: rotate the refresh token
    const refreshResponse = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: loginBody.refreshToken },
    });
    expect(refreshResponse.status()).toBe(200);
    const newTokens = await refreshResponse.json() as LoginResponse;
    expect(newTokens.refreshToken).not.toBe(loginBody.refreshToken);

    // AC-17: re-using the old (now-invalidated) refresh token must return 401
    const replayResponse = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: loginBody.refreshToken },
    });
    expect(replayResponse.status()).toBe(401);
    const replayBody = await replayResponse.json() as { code: string };
    expect(replayBody.code).toBe('REFRESH_TOKEN_INVALID');
  });

  test('AUTH-API-05 (AC-19/20) logout invalidates the refresh token and is idempotent', async ({ request }) => {
    const email = uniqueEmail('e2e-api-ac19');
    const password = 'ValidPass1';

    await request.post(`${API_BASE}/auth/register`, { data: { email, password } });
    const session = await loginViaApi(request, email, password);

    // AC-19: logout invalidates the refresh token
    const logoutResponse = await request.post(`${API_BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: { refreshToken: session.refreshToken },
    });
    expect(logoutResponse.status()).toBe(204);

    // The invalidated refresh token can no longer be used
    const refreshAfterLogout = await request.post(`${API_BASE}/auth/refresh`, {
      data: { refreshToken: session.refreshToken },
    });
    expect(refreshAfterLogout.status()).toBe(401);

    // AC-20: calling logout again with the same (already-invalidated) token returns 204 (idempotent)
    const secondLogout = await request.post(`${API_BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: { refreshToken: session.refreshToken },
    });
    expect(secondLogout.status()).toBe(204);
  });

  test('AUTH-API-06 (AC-21) admin JWT has role: ADMIN claim', async ({ request }) => {
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    expect(loginResponse.status()).toBe(200);
    const body = await loginResponse.json() as LoginResponse;
    const payload = decodeJwtPayload(body.accessToken);
    expect(payload.role).toBe('ADMIN');
  });

  test('AUTH-API-07 (AC-24) auth endpoints are publicly accessible without a token', async ({ request }) => {
    // Register with a fresh email must succeed (no auth header required)
    const registerResponse = await request.post(`${API_BASE}/auth/register`, {
      data: { email: uniqueEmail('e2e-api-ac24'), password: 'ValidPass1' },
    });
    expect(registerResponse.status()).toBe(201);

    // Login must succeed (no auth header required)
    const email = uniqueEmail('e2e-api-ac24-login');
    await request.post(`${API_BASE}/auth/register`, { data: { email, password: 'ValidPass1' } });
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: { email, password: 'ValidPass1' },
    });
    expect(loginResponse.status()).toBe(200);
  });

  test('AUTH-API-08 (AC-25) /logout returns 401 when called without an access token', async ({ request }) => {
    const logoutResponse = await request.post(`${API_BASE}/auth/logout`, {
      data: { refreshToken: 'any-token' },
    });
    expect(logoutResponse.status()).toBe(401);
  });

  test('AUTH-14 clears the session and redirects to /login when silent refresh fails', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member');
    const password = 'Member@1234';

    await registerViaApi(request, email, password);
    const session = await loginViaApi(request, email, password);

    await seedPersistedAuth(
      page,
      buildPersistedAuthState(
        email,
        session.accessToken,
        'expired-access-token',
        `${session.refreshToken}-invalid`
      )
    );

    const refreshResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/v1/auth/refresh') &&
      response.request().method() === 'POST'
    );

    await page.goto('/membership');

    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.status()).toBe(401);

    await expect(page).toHaveURL('/login');
    await page.goto('/membership');
    await expect(page).toHaveURL('/login');
  });
});
