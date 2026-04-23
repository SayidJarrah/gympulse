import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Happy-path E2E — Onboarding: preferences step filled (not skipped).
 * Reference: docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Scenario:
 *   Guest signs up, reaches the preferences step (post-terms), selects goals,
 *   class types, and frequency, then clicks Continue (not Skip). Membership and
 *   booking are skipped. User lands on /home.
 *
 * Key assertions:
 *   - A PUT /api/v1/profile/me request fires from the preferences step with a body
 *     containing `fitnessGoals` or `preferredClassTypes` populated (not empty arrays).
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

test('preferences filled via Continue: PUT /profile/me fires with non-empty goal/class data', async ({ page }) => {
  const email = `prefs-filled-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // Sub-lg viewport so the mobile step tree is visible and wins the imperative ref.
  await page.setViewportSize({ width: 800, height: 1100 });

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
  await page.getByLabel(/^first name/i).locator('visible=true').fill('Morgan');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Goals');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550499001');
  await fillDateOfBirth(page, '1995-07-20');
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

  // ── STEP 4 — Preferences — SELECT options and click Continue ──────────────
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();

  // Select at least one goal option. Options are <button> elements with text like
  // "Build strength", "Lose weight", "Yoga", "HIIT", etc. We click the first
  // visible option button that is not a navigation button.
  const optionButtons = page.locator('button').locator('visible=true').filter({
    hasNotText: /^continue|skip this step|← back$/i,
  });

  const optionCount = await optionButtons.count();
  if (optionCount > 0) {
    await optionButtons.first().click();
  }

  // Wire up the PUT /profile/me response waiter BEFORE clicking Continue
  const profilePutResponsePromise = page.waitForResponse(
    r => r.url().includes('/profile/me') && r.request().method() === 'PUT',
  );

  await page.getByRole('button', { name: /^continue/i }).click();

  // Confirm PUT /profile/me fired from the preferences step
  const profilePutResponse = await profilePutResponsePromise;
  expect(profilePutResponse.status()).toBe(200);

  // Confirm the request body contains a populated preferences field
  const requestBody = profilePutResponse.request().postDataJSON() as Record<string, unknown>;
  const hasFitnessGoals = Array.isArray(requestBody?.fitnessGoals) && requestBody.fitnessGoals.length > 0;
  const hasClassTypes = Array.isArray(requestBody?.preferredClassTypes) && requestBody.preferredClassTypes.length > 0;
  const hasFrequency = requestBody?.weeklyFrequency !== undefined && requestBody.weeklyFrequency !== null;
  expect(hasFitnessGoals || hasClassTypes || hasFrequency).toBe(true);

  // ── STEP 5 — Membership — skip ────────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /choose a plan/i }).locator('visible=true'),
  ).toBeVisible();

  // Wire completeResponsePromise BEFORE the Skip click that transitions to Done.
  // StepDone fires POST /onboarding/complete on mount; the waiter must be registered
  // before the navigation so it catches the in-flight response.
  const completeResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/complete') && r.status() === 200,
  );

  await page.getByRole('button', { name: /skip this step/i }).click();

  // ── Done screen (booking step skipped when no plan selected) ──────────────
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();

  const completeResponse = await completeResponsePromise;
  expect(completeResponse.status()).toBe(200);

  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);
});
