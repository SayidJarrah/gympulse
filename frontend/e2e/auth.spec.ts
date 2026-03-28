import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';

test('registers with valid data and redirects to login', async ({ page }) => {
  const email = `e2e-register-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.fill('#email', email);
  await page.fill('#password', 'TestPass1');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/login');
});

test('admin login redirects away from login page', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Admins land on the admin plans page after login
  await expect(page).toHaveURL('/admin/plans');
});

test('login with wrong password shows error banner and stays on login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', 'wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password');
  await expect(page).toHaveURL('/login');
});

test('unauthenticated visit to /admin/plans redirects to /plans', async ({ page }) => {
  await page.goto('/admin/plans');
  await expect(page).toHaveURL('/plans');
});
