import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Wait until navigation away from /login completes
  await expect(page).toHaveURL('/admin/plans');
}

test('/plans page loads and shows at least one plan card', async ({ page }) => {
  await page.goto('/plans');
  // Wait for at least one plan card link to be visible
  await expect(
    page.getByRole('link', { name: /^View details for / }).first()
  ).toBeVisible();
});

test('clicking a plan card navigates to the plan detail page', async ({ page }) => {
  await page.goto('/plans');
  const firstCard = page.getByRole('link', { name: /^View details for / }).first();
  await firstCard.waitFor({ state: 'visible' });
  // aria-label is "View details for {plan name}"
  const ariaLabel = await firstCard.getAttribute('aria-label');
  const planName = ariaLabel?.replace('View details for ', '') ?? '';
  await firstCard.click();
  await expect(page).toHaveURL(/\/plans\/.+/);
  await expect(page.getByRole('heading', { name: planName })).toBeVisible();
});

test('unauthenticated user visiting /admin/plans is redirected to /plans', async ({ page }) => {
  await page.goto('/admin/plans');
  await expect(page).toHaveURL('/plans');
});

test('admin can access /admin/plans and sees the plans table', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/plans');
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Membership Plans' })).toBeVisible();
});

test('admin creates a new plan and it appears in the table', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/plans');

  const planName = `E2E Plan ${Date.now()}`;

  await page.getByRole('button', { name: 'New Plan' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.fill('#plan-name', planName);
  await page.fill('#plan-description', 'Automated E2E test plan description.');
  await page.fill('#plan-price', '2999');
  await page.fill('#plan-duration', '30');

  await page.getByRole('button', { name: 'Save Plan' }).click();

  // Modal should close after successful save
  await expect(page.getByRole('dialog')).not.toBeVisible();

  // New plan should appear in the table
  await expect(page.getByText(planName)).toBeVisible();
});
