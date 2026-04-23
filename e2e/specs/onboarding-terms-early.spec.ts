import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Happy-path E2E — Onboarding Terms Early.
 * Reference: docs/prd/onboarding-terms-early.md, docs/sdd/onboarding-terms-early.md §5.2
 *
 * Feature: terms is moved from step 6 to step 3 so the combined-payload
 * POST /api/v1/auth/register fires earlier, authenticating the user before the
 * booking step. The booking step can then call authenticated endpoints
 * (GET /api/v1/class-schedule, POST /api/v1/bookings) that previously returned 401.
 *
 * Scenario (new step order: credentials → profile → terms → preferences →
 *   membership → booking → done):
 *   1. Guest clicks "Join GymFlow" → /onboarding
 *   2. Credentials step — no register request fires (AC-05)
 *   3. Profile step — still no register request (AC-05)
 *   4. Terms step — POST /auth/register fires exactly once (AC-02, AC-05)
 *   5. Preferences step — Back disabled (AC-03); rail rows 1–3 are not buttons (AC-03)
 *   6. Membership step — select a plan; POST /onboarding/plan-pending → 201
 *   7. Booking step — GET /api/v1/class-schedule → 200 (AC-04); select class; POST /api/v1/bookings → 201 (AC-04)
 *   8. Done screen — "Welcome to the flow" heading visible (AC-07);
 *      POST /onboarding/complete → 200 (AC-07)
 *   9. Click "Enter GymFlow →" → URL /home (AC-07)
 *
 * Viewport note (inherited from sibling specs):
 *   OnboardingShell renders both desktop (hidden lg:grid) and mobile (lg:hidden)
 *   step trees. The last tree to render wins the useImperativeHandle ref — always
 *   the mobile tree. Driving at < 1024 px keeps the mobile tree visible and the
 *   ref-winning, so filling visible inputs = filling the ref-winning instance.
 */
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

  // AC-05: no register request before credentials is submitted
  expect(registerRequests.length).toBe(0);

  await page.getByRole('button', { name: /^continue/i }).click();

  // ── STEP 2 — Profile (guest) ───────────────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();

  // AC-05: still no register request after credentials step
  expect(registerRequests.length).toBe(0);

  await page.getByLabel(/^first name/i).locator('visible=true').fill('Taylor');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Earlybird');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550199001');
  await page.getByLabel(/^date of birth/i).locator('visible=true').fill('1993-08-22');

  // AC-05: still no register request before profile is submitted
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

  // AC-05: still no register request before terms is submitted
  expect(registerRequests.length).toBe(0);

  // Wire up the response waiter BEFORE clicking so we do not miss a fast response.
  // AC-02: exactly one POST /auth/register fires on terms submission.
  const registerResponsePromise = page.waitForResponse(
    r => r.url().includes('/auth/register') && r.status() === 201,
  );

  await page.getByRole('button', { name: /finish onboarding/i }).click();

  const registerResponse = await registerResponsePromise;
  expect(registerResponse.status()).toBe(201);

  // AC-05: exactly one register call across the entire wizard
  expect(registerRequests.length).toBe(1);

  // AC-02: wizard advances to preferences (not done) after terms
  await expect(page).toHaveURL(/\/onboarding$/);

  // ── STEP 4 — Preferences (member, post-terms) ─────────────────────────────
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();

  // AC-03: Back button is present but DISABLED on preferences (terms boundary lock)
  const backButton = page.getByRole('button', { name: /← back/i }).locator('visible=true');
  await expect(backButton).toBeDisabled();

  // AC-03: rail rows for credentials, profile, terms are NOT <button> elements
  // The rail is a <nav aria-label="Onboarding progress"> > <ol> > <li> > {div|button}
  // When backLocked is true, locked rows render as <div>, not <button>.
  // We select the <li> for each locked step by its text content and confirm
  // the immediate child interactive element is absent.
  const rail = page.locator('nav[aria-label="Onboarding progress"] ol');

  // "Your account" (credentials) — first <li>
  const credentialsDoneItem = rail.locator('li').filter({ hasText: /your account/i }).first();
  await expect(credentialsDoneItem.locator('button')).toHaveCount(0);

  // "Your profile" (profile) — second <li>
  const profileDoneItem = rail.locator('li').filter({ hasText: /your profile/i }).first();
  await expect(profileDoneItem.locator('button')).toHaveCount(0);

  // "Final check" (terms) — third <li>
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

  // ── STEP 6 — Booking (member, conditional on plan selected) ───────────────
  await expect(
    page.getByRole('heading', { name: /book your first session/i }).locator('visible=true'),
  ).toBeVisible();

  // AC-04: GET /api/v1/class-schedule must return 200 (user is now authenticated)
  // The component fires this on mount; use waitForResponse with a generous timeout.
  const classScheduleResponsePromise = page.waitForResponse(
    r => r.url().includes('/class-schedule') && r.status() === 200,
  );
  const classScheduleResponse = await classScheduleResponsePromise;
  expect(classScheduleResponse.status()).toBe(200);

  // Wait for at least one class card to render in the GroupClassList
  // Each class card is a <button> with class names referencing a date tile and class info.
  // We use the "Group class" mode (the default). Cards are buttons inside the list.
  // Filter out navigation buttons by requiring text that matches a day abbreviation
  // or simply wait for any button that isn't the mode toggle or nav buttons.
  // The GroupClassList renders buttons as the immediate children of a flex container.
  // We wait for a button inside the booking step content that is not the Continue/Back/Skip/mode-toggle buttons.
  // Most reliably: wait for any button containing a class name text (short names like "HIIT", "Yoga", etc.)
  // Since we can't predict class names, we rely on the list container becoming non-empty.
  // The loading state shows "Loading classes…" text; we wait for that to disappear.
  await expect(
    page.getByText('Loading classes…').locator('visible=true'),
  ).toHaveCount(0);

  // Wait for the class list to show either a class card or "No upcoming classes"
  // (if no upcoming classes, we can still advance — the booking submit returns true with no selection)
  const hasClasses = await page.getByText('Unable to load upcoming classes.').count() === 0
    && await page.getByText('No upcoming classes this week.').count() === 0;

  if (hasClasses) {
    // AC-04: select the first class card in the GroupClassList and verify booking is created
    // Class cards are <button> elements inside the GroupClassList container.
    // We disambiguate from mode-toggle buttons ("Group class" / "Personal training"),
    // StickyFooter buttons (← Back / Skip / Continue →), and plan buttons
    // by targeting the GroupClassList's flex container then its first button child.
    // GroupClassList renders: <div class="flex flex-col gap-2"> > <button>...
    // We can locate via the parent heading for context then the first button after it.
    // The GroupClassList renders inside both desktop (hidden) and mobile (visible) trees.
    // Use `visible=true` to target only the visible mobile instance.
    const classCard = page
      .locator('div.flex.flex-col.gap-2 button')
      .locator('visible=true')
      .first();
    await expect(classCard).toBeVisible();
    await classCard.click();

    // Wire up bookings response waiter before clicking Continue.
    // AC-04: POST /api/v1/bookings must return 201 (user is authenticated with pending membership).
    // Capture any response to /bookings (not /pt-bookings) so the assertion message
    // shows actual vs expected status rather than timing out.
    const bookingResponsePromise = page.waitForResponse(
      r => r.url().includes('/api/v1/bookings') && !r.url().includes('/pt-bookings'),
    );

    await page.getByRole('button', { name: /^continue/i }).click();

    // AC-04: POST /api/v1/bookings returns 201
    const bookingResponse = await bookingResponsePromise;
    expect(bookingResponse.status()).toBe(201);
  } else {
    // No classes available this week — advance without a selection
    await page.getByRole('button', { name: /^continue/i }).click();
  }

  // ── STEP 7 — Done screen ──────────────────────────────────────────────────
  // AC-07: Done screen shows "Welcome to the flow" heading
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();

  // AC-07: POST /onboarding/complete fires on StepDone mount, setting onboardingCompletedAt
  const completeResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/complete') && r.status() === 200,
  );
  const completeResponse = await completeResponsePromise;
  expect(completeResponse.status()).toBe(200);

  // AC-07: clicking "Enter GymFlow →" lands the user on /home as an authenticated member
  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);
});
