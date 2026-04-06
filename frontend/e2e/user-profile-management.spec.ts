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

    await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
    await expect(page.locator('#profile-email')).not.toBeDisabled();
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
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByText('You do not have permission to view this profile.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to classes' })).toBeVisible();
    await expect(page.locator('#profile-email')).toHaveCount(0);
  });

  test('PROFILE-05 AC4/AC17 unauthenticated user is redirected to /login and PUT returns 401', async ({ page, request }) => {
    // GET without a token: the app should redirect to /login via AuthRoute
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');

    // PUT without a token: the API should return 401
    const putResponse = await request.put(`${API_BASE}/profile/me`, {
      data: {
        firstName: null,
        lastName: null,
        phone: null,
        dateOfBirth: null,
        fitnessGoals: [],
        preferredClassTypes: [],
      },
    });
    expect(putResponse.status()).toBe(401);
  });

  test('PROFILE-06 AC20 clearing a scalar field saves it as null', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member-profile-ac20');

    await registerViaApi(request, email);
    await loginViaUi(page, email);
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // First save: set firstName
    await page.fill('#profile-first-name', 'Temp');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Profile updated.');

    // Second save: clear firstName
    await page.fill('#profile-first-name', '');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Profile updated.');

    // Reload and confirm field is empty
    await page.reload();
    await expect(page.locator('#profile-first-name')).toHaveValue('');
  });

  test('PROFILE-07 AC21 clearing a list field saves it as an empty array', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member-profile-ac21');

    await registerViaApi(request, email);
    await loginViaUi(page, email);
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // First save: add a fitness goal
    await addChip(page, '#profile-fitness-goals', 'Weight loss');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Profile updated.');

    // Remove the chip via its remove button
    await page.getByRole('button', { name: 'Remove Weight loss' }).click();

    // Second save: empty list
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Profile updated.');

    // Reload and confirm no chips
    await page.reload();
    await expect(page.getByText('Weight loss')).toHaveCount(0);
  });

  test('PROFILE-08 AC15/AC16 duplicate chip is deduplicated on commit', async ({ page, request }) => {
    const email = uniqueEmail('e2e-member-profile-ac15');

    await registerViaApi(request, email);
    await loginViaUi(page, email);
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Add same value twice (case-insensitive)
    await addChip(page, '#profile-fitness-goals', 'Yoga');
    await addChip(page, '#profile-fitness-goals', 'yoga');

    // Only one chip should be present
    await expect(page.locator('[aria-label="Remove Yoga"]')).toHaveCount(1);

    // Same for preferredClassTypes
    await addChip(page, '#profile-preferred-class-types', 'HIIT');
    await addChip(page, '#profile-preferred-class-types', 'hiit');

    await expect(page.locator('[aria-label="Remove HIIT"]')).toHaveCount(1);
  });
});
