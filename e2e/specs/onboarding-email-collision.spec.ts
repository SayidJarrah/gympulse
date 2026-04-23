import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * E2E — Onboarding: duplicate email collision at terms step.
 * Reference: docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Scenario:
 *   An existing account owns email X. A second guest runs the wizard using email X,
 *   reaches the terms step, and clicks Finish. POST /api/v1/auth/register returns
 *   409 EMAIL_ALREADY_EXISTS. The wizard snaps back to the credentials step with a
 *   persistent late-error banner visible (role="alert"). Editing the email field
 *   clears the banner.
 *
 * Setup:
 *   The "owner" account is pre-registered via page.request.post to the backend
 *   directly (bypasses the UI) to guarantee it exists before the wizard run.
 *   Request body uses the exact RegisterRequest field names from the backend DTO:
 *   { email, password, firstName, lastName, phone, dateOfBirth, agreeTerms, agreeWaiver }
 *
 * Key assertions:
 *   - POST /auth/register returns 409
 *   - URL stays on /onboarding after the 409
 *   - Credentials step heading is visible (wizard snapped back)
 *   - role="alert" banner is visible
 *   - Typing in the email field dismisses the banner
 *
 * Viewport note:
 *   Sub-lg (800 × 1100) so the mobile step tree is visible and wins the
 *   useImperativeHandle ref. See onboarding-plan-group-class.spec.ts for details.
 */

/** @see onboarding-plan-group-class.spec.ts for DOM facts */
async function fillDateOfBirth(page: Page, iso: string): Promise<void> {
  const [yearStr, monthStr, dayStr] = iso.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[month - 1];

  await page.getByRole('button', { name: /date of birth/i }).locator('visible=true').click();
  const dialog = page.getByRole('dialog', { name: /pick a date/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: /choose the year/i }).selectOption(String(year));
  await dialog.getByRole('combobox', { name: /choose the month/i }).selectOption(monthName);
  const dayPattern = new RegExp(`${monthName}.*\\b${day}(?:st|nd|rd|th).*${year}`, 'i');
  await dialog.getByRole('button', { name: dayPattern }).click();
  await expect(dialog).toBeHidden();
}

test('duplicate email at terms: 409 snaps back to credentials with alert banner', async ({ page, baseURL }) => {
  const sharedEmail = `collision-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // Sub-lg viewport so the mobile step tree is visible and wins the imperative ref.
  await page.setViewportSize({ width: 800, height: 1100 });

  // Pre-register the owner account directly via the backend API.
  // Field names match RegisterRequest.kt exactly: agreeTerms, agreeWaiver (not acceptedTerms).
  const backendBase = baseURL ?? 'http://localhost:5174';
  const ownerRegistration = await page.request.post(`${backendBase}/api/v1/auth/register`, {
    data: {
      email: sharedEmail,
      password,
      firstName: 'Owner',
      lastName: 'Incumbent',
      phone: '+15550199999',
      dateOfBirth: '1990-01-01',
      agreeTerms: true,
      agreeWaiver: true,
    },
  });
  // Confirm the owner was created successfully (201) before running the collision test.
  expect(ownerRegistration.status()).toBe(201);

  // ── Landing → wizard ───────────────────────────────────────────────────────
  await page.goto('/');
  await page.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  // ── STEP 1 — Credentials (collision email) ────────────────────────────────
  await expect(page.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page.getByLabel(/email/i).locator('visible=true').first().fill(sharedEmail);
  await page.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 2 — Profile ──────────────────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByLabel(/^first name/i).locator('visible=true').fill('Duplicate');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('User');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550599002');
  await fillDateOfBirth(page, '1990-09-09');
  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 3 — Terms (409 fires here) ──────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /final check/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: /terms of use/i }).locator('visible=true').click();
  await page
    .getByRole('checkbox', { name: /health and liability waiver/i })
    .locator('visible=true')
    .click();

  // Capture the 409 response
  const registerResponsePromise = page.waitForResponse(
    r => r.url().includes('/auth/register'),
  );
  await page.getByRole('button', { name: /finish onboarding/i }).click();

  const registerResponse = await registerResponsePromise;
  expect(registerResponse.status()).toBe(409);

  // URL stays on /onboarding
  await expect(page).toHaveURL(/\/onboarding$/);

  // Wizard snaps back to credentials step
  await expect(
    page.getByRole('heading', { name: /your account/i }).locator('visible=true'),
  ).toBeVisible();

  // A persistent error banner is visible
  const alertBanner = page.getByRole('alert').locator('visible=true').first();
  await expect(alertBanner).toBeVisible();

  // Typing in the email field dismisses the banner
  const emailField = page.getByLabel(/email/i).locator('visible=true').first();
  await emailField.fill('');
  await emailField.type('new-');

  // After editing, the banner should no longer be visible
  await expect(alertBanner).not.toBeVisible();
});
