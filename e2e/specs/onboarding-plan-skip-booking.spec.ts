import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Happy-path E2E — Onboarding: plan selected, booking step skipped.
 * Reference: docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Scenario:
 *   Guest signs up, picks a plan (plan-pending 201), then on the booking step
 *   clicks "Skip this step" without selecting a class or trainer. Wizard advances
 *   to done and user lands on /home.
 *
 * Key assertions:
 *   - POST /onboarding/plan-pending → 201
 *   - NO /api/v1/bookings request fires
 *   - NO /api/v1/pt-bookings request fires
 *   - POST /onboarding/complete → 200
 *   - Final URL /home
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

test('booking step skipped: no booking request fires, lands on /home', async ({ page }) => {
  const email = `skip-booking-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // Sub-lg viewport so the mobile step tree is visible and wins the imperative ref.
  await page.setViewportSize({ width: 800, height: 1100 });

  // Track all booking-related requests to confirm none fire.
  const bookingRequests: string[] = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/v1/bookings') || url.includes('/api/v1/pt-bookings')) {
      bookingRequests.push(url);
    }
  });

  // ── Landing → wizard ───────────────────────────────────────────────────────
  await page.goto('/');
  await page.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  // ── STEP 1 — Credentials ──────────────────────────────────────────────────
  await expect(page.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 2 — Profile ──────────────────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByLabel(/^first name/i).locator('visible=true').fill('Alex');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Skipper');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550399001');
  await fillDateOfBirth(page, '1988-11-05');
  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 3 — Terms (register fires here) ─────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /final check/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: /terms of use/i }).locator('visible=true').click();
  await page
    .getByRole('checkbox', { name: /health and liability waiver/i })
    .locator('visible=true')
    .click();

  const registerResponsePromise = page.waitForResponse(
    r => r.url().includes('/auth/register') && r.status() === 201,
  );
  await page.getByRole('button', { name: /finish onboarding/i }).click();
  await registerResponsePromise;

  // ── STEP 4 — Preferences — skip ───────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('button', { name: /skip this step/i }).click();

  // ── STEP 5 — Membership — pick first plan ─────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /choose a plan/i }).locator('visible=true'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /select plan/i }).first()).toBeVisible();
  await page.getByRole('button', { name: /select plan/i }).first().click();
  await expect(page.getByRole('button', { name: /^selected$/i }).first()).toBeVisible();

  // POST /onboarding/plan-pending must return 201
  const planPendingResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/plan-pending') && r.status() === 201,
  );
  await page.getByRole('button', { name: /^continue/i }).click();
  await planPendingResponsePromise;

  // ── STEP 6 — Booking — skip without selecting anything ────────────────────
  await expect(
    page.getByRole('heading', { name: /book your first session/i }).locator('visible=true'),
  ).toBeVisible();

  // Wire completeResponsePromise BEFORE the Skip click that transitions to Done.
  // StepDone fires POST /onboarding/complete on mount; the waiter must be registered
  // before the navigation so it catches the in-flight response.
  const completeResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/complete') && r.status() === 200,
  );

  // Skip the booking step entirely
  await page.getByRole('button', { name: /skip this step/i }).click();

  // ── STEP 7 — Done screen ──────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();

  const completeResponse = await completeResponsePromise;
  expect(completeResponse.status()).toBe(200);

  // Confirm no booking or PT-booking requests fired at any point
  expect(bookingRequests).toHaveLength(0);

  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);
});
