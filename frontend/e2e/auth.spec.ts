import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';

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
      'An account with this email already exists. Please log in.'
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
