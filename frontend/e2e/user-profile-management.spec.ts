import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';
const USER_PASSWORD = 'Member@1234';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
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

async function loginViaUi(
  page: Page,
  email: string,
  password = USER_PASSWORD,
  expectedPath = '/plans'
): Promise<void> {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(expectedPath);
}

async function loginAsAdminUi(page: Page): Promise<void> {
  await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD, '/admin/plans');
}

async function openProfileFromPlans(page: Page): Promise<void> {
  await expect(page).toHaveURL('/plans');
  await page.getByRole('link', { name: 'Profile' }).click();
  await expect(page).toHaveURL('/profile');
}

async function addChip(page: Page, inputSelector: string, value: string): Promise<void> {
  await page.locator(inputSelector).fill(value);
  await page.locator(inputSelector).press('Enter');
}

test.describe('User Profile Management', () => {
  test('PROFILE-01 first-time user opens profile from the authenticated navbar', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member-profile');

    await registerViaApi(request, email);
    await loginViaUi(page, email);
    await openProfileFromPlans(page);

    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(page.locator('#profile-email')).toBeDisabled();
    await expect(page.locator('#profile-email')).toHaveValue(email);
    await expect(page.locator('#profile-first-name')).toHaveValue('');
    await expect(page.locator('#profile-last-name')).toHaveValue('');
    await expect(page.locator('#profile-phone')).toHaveValue('');
    await expect(page.locator('#profile-date-of-birth')).toHaveValue('');
    await expect(page.locator('#profile-fitness-goals')).toBeVisible();
    await expect(page.locator('#profile-preferred-class-types')).toBeVisible();
  });

  test('PROFILE-02 user saves profile details and sees persisted normalized values', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member-profile');

    await registerViaApi(request, email);
    await loginViaUi(page, email);
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    await page.fill('#profile-first-name', 'Alice');
    await page.fill('#profile-last-name', 'Brown');
    await page.fill('#profile-phone', '+48 123 123 123');
    await page.fill('#profile-date-of-birth', '1994-08-12');
    await addChip(page, '#profile-fitness-goals', 'Build strength');
    await addChip(page, '#profile-fitness-goals', 'Improve mobility');
    await addChip(page, '#profile-preferred-class-types', 'Yoga');
    await addChip(page, '#profile-preferred-class-types', 'HIIT');

    await page.getByRole('button', { name: 'Save changes', exact: true }).click();

    await expect(page.getByRole('status')).toContainText('Profile updated.');
    await expect(page.locator('#profile-phone')).toHaveValue('+48123123123');
    await expect(page.locator('#profile-first-name')).toHaveValue('Alice');
    await expect(page.locator('#profile-last-name')).toHaveValue('Brown');

    await page.reload();

    await expect(page.locator('#profile-email')).toHaveValue(email);
    await expect(page.locator('#profile-first-name')).toHaveValue('Alice');
    await expect(page.locator('#profile-last-name')).toHaveValue('Brown');
    await expect(page.locator('#profile-phone')).toHaveValue('+48123123123');
    await expect(page.locator('#profile-date-of-birth')).toHaveValue('1994-08-12');
    await expect(page.getByText('Build strength')).toBeVisible();
    await expect(page.getByText('Improve mobility')).toBeVisible();
    await expect(page.getByText('Yoga')).toBeVisible();
    await expect(page.getByText('HIIT')).toBeVisible();
  });

  test('PROFILE-03 client-side validation blocks invalid phone submission', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member-profile');
    let putAttempted = false;

    await page.route('**/api/v1/profile/me', async (route) => {
      if (route.request().method() === 'PUT') {
        putAttempted = true;
      }

      await route.continue();
    });

    await registerViaApi(request, email);
    await loginViaUi(page, email);
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    await page.fill('#profile-phone', '12345');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();

    await expect(page.locator('#profile-phone-error')).toContainText(
      'Enter a valid international phone number.'
    );
    await expect(page.getByText('Profile updated.')).toHaveCount(0);

    await page.waitForTimeout(250);
    expect(putAttempted).toBe(false);
  });

  test('PROFILE-04 admin account receives the profile access-denied state', async ({ page }) => {
    await loginAsAdminUi(page);

    await page.goto('/profile');

    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: 'Unable to load profile' })).toBeVisible();
    await expect(page.getByText('You do not have permission to view this profile.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.locator('#profile-email')).toHaveCount(0);
  });
});
