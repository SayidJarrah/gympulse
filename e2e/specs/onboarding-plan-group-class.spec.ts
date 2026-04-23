import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Canonical happy-path E2E — Onboarding: plan selection + group-class booking.
 * Reference: docs/prd/onboarding-terms-early.md, docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Scenario:
 *   1. Guest clicks "Join GymFlow" → /onboarding (credentials step).
 *   2. Credentials step — no register request fires yet.
 *   3. Profile step — still no register request.
 *   4. Terms step — POST /auth/register fires exactly once; wizard advances to preferences.
 *   5. Preferences step — Back button is disabled (back-lock); rail rows 1–3 are not
 *      interactive buttons (back-lock guarantee).
 *   6. Membership step — select a plan; POST /onboarding/plan-pending → 201.
 *   7. Booking step (group-class mode by default) — GET /api/v1/class-schedule → 200;
 *      select first available class card; POST /api/v1/bookings → 201.
 *      Falls back to Continue-with-no-selection when no classes are available.
 *   8. Done screen — "Welcome to the flow" heading; POST /onboarding/complete → 200.
 *   9. "Enter GymFlow →" → URL /home.
 *
 * Viewport note:
 *   OnboardingShell renders both desktop (hidden lg:grid) and mobile (lg:hidden)
 *   step trees. The last tree to render wins the useImperativeHandle ref — always
 *   the mobile tree. Driving at < 1024 px keeps the mobile tree visible and the
 *   ref-winning, so filling visible inputs = filling the ref-winning instance.
 */

/**
 * Fill the DateField component (a <button aria-haspopup="dialog"> trigger that opens
 * a react-day-picker calendar with captionLayout="dropdown").
 *
 * DOM facts (verified against live stack 2026-04-23):
 *   - Dialog: role="dialog" name="Pick a date"
 *   - Month: combobox "Choose the Month", options are text labels ("January"…"December")
 *   - Year:  combobox "Choose the Year",  options are year strings ("1990"…)
 *   - Days:  <button> inside a role="grid", aria-label = "{Weekday}, {Month} {day}{ord}, {year}"
 */
async function fillDateOfBirth(page: Page, iso: string): Promise<void> {
  const [yearStr, monthStr, dayStr] = iso.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-based
  const day = Number(dayStr);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthName = monthNames[month - 1];

  // Open the popover — target the visible trigger button
  await page.getByRole('button', { name: /date of birth/i }).locator('visible=true').click();

  const dialog = page.getByRole('dialog', { name: /pick a date/i });
  await expect(dialog).toBeVisible();

  // Select year then month using accessible combobox names
  await dialog.getByRole('combobox', { name: /choose the year/i }).selectOption(String(year));
  await dialog.getByRole('combobox', { name: /choose the month/i }).selectOption(monthName);

  // Click the day button. aria-label format: "{Weekday}, {Month} {day}{ord}, {year}"
  // Match loosely: month name + day number + year anywhere in the label.
  const dayPattern = new RegExp(`${monthName}.*\\b${day}(?:st|nd|rd|th).*${year}`, 'i');
  await dialog.getByRole('button', { name: dayPattern }).click();

  // Dialog should close after day selection
  await expect(dialog).toBeHidden();
}

test('terms-early reorder: register fires at terms, booking step runs authenticated and creates a real booking', async ({ page }) => {
  const email = `terms-early-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // Sub-lg viewport so the mobile step tree is visible and wins the imperative ref.
  await page.setViewportSize({ width: 800, height: 1100 });

  // Track all requests to /auth/register across the full wizard run.
  const registerRequests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('/auth/register')) {
      registerRequests.push(req.url());
    }
  });

  // ── Landing → wizard ───────────────────────────────────────────────────────
  await page.goto('/');
  await page.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  // ── STEP 1 — Credentials (guest) ──────────────────────────────────────────
  await expect(page.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page.getByLabel(/password/i).locator('visible=true').first().fill(password);

  // No register request before credentials is submitted
  expect(registerRequests.length).toBe(0);

  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 2 — Profile (guest) ───────────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();

  // Still no register request after credentials step
  expect(registerRequests.length).toBe(0);

  await page.getByLabel(/^first name/i).locator('visible=true').fill('Taylor');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Earlybird');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550199001');
  await fillDateOfBirth(page, '1993-08-22');

  // Still no register request before profile is submitted
  expect(registerRequests.length).toBe(0);

  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 3 — Terms (guest → member, register fires here) ──────────────────
  await expect(
    page.getByRole('heading', { name: /final check/i }).locator('visible=true'),
  ).toBeVisible();

  await page.getByRole('checkbox', { name: /terms of use/i }).locator('visible=true').click();
  await page
    .getByRole('checkbox', { name: /health and liability waiver/i })
    .locator('visible=true')
    .click();

  // Still no register request before terms is submitted
  expect(registerRequests.length).toBe(0);

  // Wire up the response waiter BEFORE clicking so we do not miss a fast response.
  const registerResponsePromise = page.waitForResponse(
    r => r.url().includes('/auth/register') && r.status() === 201,
  );

  await page.getByRole('button', { name: /finish onboarding/i }).click();

  const registerResponse = await registerResponsePromise;
  expect(registerResponse.status()).toBe(201);

  // Exactly one register call across the entire wizard
  expect(registerRequests.length).toBe(1);

  // Wizard advances to preferences (not done) after terms
  await expect(page).toHaveURL(/\/onboarding$/);

  // ── STEP 4 — Preferences (member, post-terms) ─────────────────────────────
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();

  // Back button is present but DISABLED on preferences (terms boundary lock)
  const backButton = page.getByRole('button', { name: /← back/i }).locator('visible=true');
  await expect(backButton).toBeDisabled();

  // Rail rows for credentials, profile, terms are NOT <button> elements.
  // The rail is a <nav aria-label="Onboarding progress"> > <ol> > <li> > {div|button}.
  // When backLocked is true, locked rows render as <div>, not <button>.
  const rail = page.locator('nav[aria-label="Onboarding progress"] ol');

  const credentialsDoneItem = rail.locator('li').filter({ hasText: /your account/i }).first();
  await expect(credentialsDoneItem.locator('button')).toHaveCount(0);

  const profileDoneItem = rail.locator('li').filter({ hasText: /your profile/i }).first();
  await expect(profileDoneItem.locator('button')).toHaveCount(0);

  const termsDoneItem = rail.locator('li').filter({ hasText: /final check/i }).first();
  await expect(termsDoneItem.locator('button')).toHaveCount(0);

  // Skip preferences
  await page.getByRole('button', { name: /skip this step/i }).click();

  // ── STEP 5 — Membership (member) ──────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /choose a plan/i }).locator('visible=true'),
  ).toBeVisible();

  // Wait for plan cards to load (no error state)
  await expect(page.getByRole('button', { name: /select plan/i }).first()).toBeVisible();

  // Select the first available plan
  await page.getByRole('button', { name: /select plan/i }).first().click();
  await expect(page.getByRole('button', { name: /^selected$/i }).first()).toBeVisible();

  // Wire up plan-pending response waiter before clicking Continue
  const planPendingResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/plan-pending') && r.status() === 201,
  );

  await page.getByRole('button', { name: /^continue/i }).click();

  await planPendingResponsePromise;

  // ── STEP 6 — Booking (member, group-class mode) ────────────────────────────
  await expect(
    page.getByRole('heading', { name: /book your first session/i }).locator('visible=true'),
  ).toBeVisible();

  // GET /api/v1/class-schedule must return 200 (user is now authenticated)
  const classScheduleResponsePromise = page.waitForResponse(
    r => r.url().includes('/class-schedule') && r.status() === 200,
  );
  const classScheduleResponse = await classScheduleResponsePromise;
  expect(classScheduleResponse.status()).toBe(200);

  // Wait for loading state to clear
  await expect(
    page.getByText('Loading classes…').locator('visible=true'),
  ).toHaveCount(0);

  const hasClasses = await page.getByText('Unable to load upcoming classes.').count() === 0
    && await page.getByText('No upcoming classes this week.').count() === 0;

  // Wire completeResponsePromise BEFORE the Continue click that advances to Done.
  // StepDone fires POST /onboarding/complete on mount; if the waiter is registered
  // after the heading is already visible the response has already resolved and the
  // waiter hangs waiting for a second matching response that never comes.
  const completeResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/complete') && r.status() === 200,
  );

  if (hasClasses) {
    const classCard = page
      .locator('div.flex.flex-col.gap-2 button')
      .locator('visible=true')
      .first();
    await expect(classCard).toBeVisible();
    await classCard.click();

    // POST /api/v1/bookings must return 201 (user is authenticated with pending membership)
    const bookingResponsePromise = page.waitForResponse(
      r => r.url().includes('/api/v1/bookings') && !r.url().includes('/pt-bookings'),
    );

    await page.getByRole('button', { name: /^continue/i }).click();

    const bookingResponse = await bookingResponsePromise;
    expect(bookingResponse.status()).toBe(201);
  } else {
    // No classes available this week — advance without a selection
    await page.getByRole('button', { name: /^continue/i }).click();
  }

  // ── STEP 7 — Done screen ──────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();

  // POST /onboarding/complete fires on StepDone mount, setting onboardingCompletedAt
  const completeResponse = await completeResponsePromise;
  expect(completeResponse.status()).toBe(200);

  // Clicking "Enter GymFlow →" lands the user on /home as an authenticated member
  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);
});
