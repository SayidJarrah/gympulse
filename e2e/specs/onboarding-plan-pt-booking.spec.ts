import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Happy-path E2E — Onboarding: plan selection + personal-training booking.
 * Reference: docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Scenario:
 *   Guest signs up, picks a plan, switches the booking step to "Personal training"
 *   mode, picks a trainer and an available slot, POST /api/v1/pt-bookings → 201,
 *   lands on /home.
 *
 *   If the trainer list or slots render empty, falls back to advancing via Continue
 *   with no selection and still asserts landing on /home (mirrors the group-class
 *   `hasClasses` fallback pattern).
 *
 * Key assertions:
 *   - GET /api/v1/trainers/pt → 200
 *   - GET /api/v1/trainers/{id}/pt-availability → 200 (when a trainer is selected)
 *   - POST /api/v1/pt-bookings → 201 (when a slot is selected)
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

test('PT booking mode: register fires at terms, PT booking created, lands on /home', async ({ page }) => {
  const email = `pt-booking-${randomUUID()}@test.gympulse.local`;
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
  await page.getByLabel(/^first name/i).locator('visible=true').fill('Jordan');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Trainer');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550299001');
  await fillDateOfBirth(page, '1990-03-15');
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

  const planPendingResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/plan-pending') && r.status() === 201,
  );
  await page.getByRole('button', { name: /^continue/i }).click();
  await planPendingResponsePromise;

  // ── STEP 6 — Booking (personal training mode) ─────────────────────────────
  await expect(
    page.getByRole('heading', { name: /book your first session/i }).locator('visible=true'),
  ).toBeVisible();

  // Wire trainers response waiter BEFORE clicking PT mode — the request fires on switch.
  const trainersResponsePromise = page.waitForResponse(
    r => r.url().includes('/trainers/pt') && r.status() === 200,
  );

  // Switch to Personal training mode via the mode toggle button
  await page.getByRole('button', { name: /personal training/i }).locator('visible=true').click();

  // GET /api/v1/trainers/pt must return 200
  const trainersResponse = await trainersResponsePromise;
  expect(trainersResponse.status()).toBe(200);

  // Wait for loading state to clear
  await expect(page.getByText('Loading trainers…').locator('visible=true')).toHaveCount(0);

  const hasTrainers = await page.getByText('No trainers available.').count() === 0
    && await page.getByText('Unable to load trainers.').count() === 0;

  // Wire completeResponsePromise BEFORE the Continue click that advances to Done.
  // StepDone fires POST /onboarding/complete on mount; registering the waiter after
  // the heading is visible means the response has already resolved and the waiter
  // hangs waiting for a second matching response that never comes.
  const completeResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/complete') && r.status() === 200,
  );

  if (hasTrainers) {
    // Trainer cards live in a `div.flex.flex-col.gap-3` container (distinct from the
    // group-class `gap-2` container that persists in the hidden desktop tree even in PT
    // mode). Scoping to `gap-3` ensures we never pick up group-class buttons.
    const trainerCard = page
      .locator('div.flex.flex-col.gap-3 button')
      .locator('visible=true')
      .first();
    await expect(trainerCard).toBeVisible();

    // Wire up availability response waiter before clicking the trainer.
    // Match any response (not just 200) so the waiter resolves even on error status
    // and the assertion below produces a clear failure rather than a 30s timeout.
    const availabilityResponsePromise = page.waitForResponse(
      r => r.url().includes('/pt-availability'),
    );
    await trainerCard.click();
    const availabilityResponse = await availabilityResponsePromise;
    expect(availabilityResponse.status()).toBe(200);

    // Wait for slot loading to clear
    await expect(page.getByText('Loading availability…').locator('visible=true')).toHaveCount(0);

    const hasSlots = await page.getByText('No available slots.').count() === 0
      && await page.getByText('Unable to load availability.').count() === 0;

    if (hasSlots) {
      // After selecting a trainer, slot buttons appear inside the same gap-3 container.
      // The selected trainer is index 0; first slot is at index 1.
      const slot = page
        .locator('div.flex.flex-col.gap-3 button')
        .locator('visible=true')
        .nth(1);
      const slotVisible = await slot.isVisible().catch(() => false);

      if (slotVisible) {
        await slot.click();

        // POST /api/v1/pt-bookings must return 201
        const ptBookingResponsePromise = page.waitForResponse(
          r => r.url().includes('/pt-bookings') && r.status() === 201,
        );
        await page.getByRole('button', { name: /^continue/i }).click();
        const ptBookingResponse = await ptBookingResponsePromise;
        expect(ptBookingResponse.status()).toBe(201);
      } else {
        await page.getByRole('button', { name: /^continue/i }).click();
      }
    } else {
      await page.getByRole('button', { name: /^continue/i }).click();
    }
  } else {
    await page.getByRole('button', { name: /^continue/i }).click();
  }

  // ── STEP 7 — Done screen ──────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();

  const completeResponse = await completeResponsePromise;
  expect(completeResponse.status()).toBe(200);

  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);
});
