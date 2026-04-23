import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Happy-path E2E — Onboarding Unified Signup.
 * Reference: docs/prd/onboarding-unified-signup.md, docs/sdd/onboarding-unified-signup.md §5.2
 *
 * Scenario:
 *   Guest clicks "Join GymFlow" CTA on landing page → directed straight into the
 *   onboarding wizard at the credentials step (AC-01) → fills credentials (AC-02) →
 *   fills mandatory profile → skips optional steps (AC-04) → submits terms, which
 *   triggers a single POST /api/v1/auth/register with the combined payload (AC-05) →
 *   lands on /home as an authenticated Member (AC-07).
 *
 * The test asserts AC-05 (late account creation) by collecting all requests to
 * /auth/register throughout the run and confirming that exactly one occurred and
 * it was triggered only after the terms step was submitted.
 *
 * Viewport note (inherited from onboarding-happy-path.spec.ts):
 *   OnboardingShell renders both desktop (hidden lg:grid) and mobile (lg:hidden)
 *   step trees. The last tree to render wins the useImperativeHandle ref — always
 *   the mobile tree. Driving at < 1024 px keeps the mobile tree visible and the
 *   ref-winning, so filling visible inputs = filling the ref-winning instance.
 */
test('guest signs up through the unified onboarding wizard and lands on /home', async ({ page }) => {
  const email = `onboarding-unified-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // Sub-lg viewport so the mobile step tree is visible and wins the imperative ref.
  await page.setViewportSize({ width: 800, height: 1100 });

  // Track every request to /auth/register so we can assert the count after the run.
  const registerRequests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('/auth/register')) {
      registerRequests.push(req.url());
    }
  });

  // ── AC-01 — Sign up CTA goes straight to the wizard ──────────────────────
  await page.goto('/');

  // The landing page nav has a "Join GymFlow" CTA (PulseNav.tsx).
  await page.getByRole('link', { name: /join gymflow/i }).click();

  // No intermediate stop at /register or /login — land directly on /onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);

  // ── AC-02 — Credentials step (step 1 of the wizard) ───────────────────────
  // The step heading says "Your account" per the handoff (STEP 01 · ACCOUNT).
  // We assert the email and password inputs are present; labels per StepCredentials.
  await expect(page.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();

  await page.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page.getByLabel(/password/i).locator('visible=true').first().fill(password);

  // Assert no register request has been sent yet (AC-05: deferred account creation).
  expect(registerRequests.length).toBe(0);

  await page.getByRole('button', { name: /^continue/i }).click();

  // ── Profile step (REQUIRED — step 2) ─────────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();

  // Still no register request (AC-05: not triggered by the credentials step).
  expect(registerRequests.length).toBe(0);

  await page.getByLabel(/^first name/i).locator('visible=true').fill('Test');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Runner');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550100001');
  await page.getByLabel(/^date of birth/i).locator('visible=true').fill('1995-06-15');
  await page.getByRole('button', { name: /^continue/i }).click();

  // ── AC-04 — Preferences (optional) — skip ────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('button', { name: /skip this step/i }).click();

  // ── AC-04 — Membership (optional) — skip ─────────────────────────────────
  await expect(
    page.getByRole('heading', { name: /choose a plan/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('button', { name: /skip this step/i }).click();

  // Booking step is hidden when no plan is selected (per SDD §5.2 step 8).
  // Terms step follows immediately.

  // ── Terms step (REQUIRED — final mandatory step) ──────────────────────────
  await expect(
    page.getByRole('heading', { name: /final check/i }).locator('visible=true'),
  ).toBeVisible();

  await page.getByRole('checkbox', { name: /terms of use/i }).locator('visible=true').click();
  await page
    .getByRole('checkbox', { name: /health and liability waiver/i })
    .locator('visible=true')
    .click();

  // ── AC-05 — Single POST /auth/register on terms submission ────────────────
  // No register request must have fired before this point.
  expect(registerRequests.length).toBe(0);

  // Wire up the response waiter BEFORE clicking so we do not miss a fast response.
  const registerResponsePromise = page.waitForResponse(
    r => r.url().includes('/auth/register') && r.status() === 201,
  );

  await page.getByRole('button', { name: /finish onboarding/i }).click();

  // Wait for the combined-payload 201 (proves the backend account was created here).
  const registerResponse = await registerResponsePromise;
  expect(registerResponse.status()).toBe(201);

  // Exactly one call was made to /auth/register across the entire wizard.
  expect(registerRequests.length).toBe(1);

  // ── AC-07 — Done screen, then land on /home ───────────────────────────────
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();
  await page.getByRole('button', { name: /enter gymflow/i }).click();

  await expect(page).toHaveURL(/\/home$/);
});
