import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * E2E — Onboarding: route guard behavior (two test cases).
 * Reference: docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Test A — completed user cannot re-enter /onboarding.
 *   Register via the wizard all the way to done, land on /home. Navigate directly
 *   to /onboarding. Assert URL redirects back to /home.
 *
 * Test B — incomplete user is funnelled to /onboarding.
 *   Register via wizard but stop before completing (close context after terms fires,
 *   before reaching done). Fresh context: log in, navigate to /home. Assert URL
 *   becomes /onboarding.
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

test('completed user: after dismissing Done screen, re-entry to /onboarding redirects to /home', async ({ browser }) => {
  const email = `guard-done-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 800, height: 1100 });

  // ── Full wizard run to completion ─────────────────────────────────────────
  await page.goto('/');
  await page.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  // Credentials
  await expect(page.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page.getByRole('button', { name: /^continue/i }).click();

  // Profile
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByLabel(/^first name/i).locator('visible=true').fill('Guard');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Done');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550811001');
  await fillDateOfBirth(page, '1988-12-25');
  await page.getByRole('button', { name: /^continue/i }).click();

  // Terms
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

  // Preferences — skip
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('button', { name: /skip this step/i }).click();

  // Membership — skip
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

  // Done screen
  await expect(page.getByRole('heading', { name: /welcome to the flow/i })).toBeVisible();
  await completeResponsePromise;

  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  // ── Attempt to re-enter /onboarding after completion ─────────────────────
  // OnboardingRoute allows re-rendering when currentStep === 'done' in the store.
  // Clear the onboarding store so currentStep is no longer 'done' — the guard
  // must then redirect based on onboardingCompletedAt (set in auth store/DB).
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('gf:onboarding:')) localStorage.removeItem(k);
    });
  });

  await page.goto('/onboarding');

  // Route guard must redirect a completed user (onboardingCompletedAt set) to /home
  await expect(page).toHaveURL(/\/home$/, { timeout: 10_000 });

  await ctx.close();
});

test('incomplete user: navigating to /home is redirected to /onboarding', async ({ browser }) => {
  const email = `guard-incomplete-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // ── Context 1: register through terms only, then abandon ──────────────────
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await page1.setViewportSize({ width: 800, height: 1100 });

  await page1.goto('/');
  await page1.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page1).toHaveURL(/\/onboarding$/);

  // Credentials
  await expect(page1.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page1.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page1.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page1.getByRole('button', { name: /^continue/i }).click();

  // Profile
  await expect(
    page1.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page1.getByLabel(/^first name/i).locator('visible=true').fill('Guard');
  await page1.getByLabel(/^last name/i).locator('visible=true').fill('Incomplete');
  await page1.getByLabel(/^phone/i).locator('visible=true').fill('+15550911001');
  await fillDateOfBirth(page1, '1993-03-03');
  await page1.getByRole('button', { name: /^continue/i }).click();

  // Terms — register fires here (account exists but onboarding not completed)
  await expect(
    page1.getByRole('heading', { name: /final check/i }).locator('visible=true'),
  ).toBeVisible();
  await page1.getByRole('checkbox', { name: /terms of use/i }).locator('visible=true').click();
  await page1
    .getByRole('checkbox', { name: /health and liability waiver/i })
    .locator('visible=true')
    .click();

  const registerResponsePromise = page1.waitForResponse(
    r => r.url().includes('/auth/register') && r.status() === 201,
  );
  await page1.getByRole('button', { name: /finish onboarding/i }).click();
  await registerResponsePromise;

  // Preferences visible — abandon here (onboarding not completed)
  await expect(
    page1.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();

  await ctx1.close();

  // ── Context 2: log in and navigate to /home — expect redirect to /onboarding ─
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.setViewportSize({ width: 800, height: 1100 });

  await page2.goto('/login');
  await page2.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page2.getByLabel(/password/i).locator('visible=true').first().fill(password);

  // Wait for the login API response before navigating away — avoids a race where
  // goto('/home') fires before the auth token is stored and UserRoute treats the
  // user as unauthenticated, redirecting to /login instead of /onboarding.
  const loginResponsePromise = page2.waitForResponse(
    r => r.url().includes('/auth/login') && r.status() === 200,
  );
  await page2.getByRole('button', { name: /log in|sign in/i }).click();
  await loginResponsePromise;

  // Wait for the post-login URL to settle off /login before navigating to /home.
  await page2.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10_000 });

  // Now navigate to /home — route guard must redirect incomplete user to /onboarding.
  await page2.goto('/home');
  await expect(page2).toHaveURL(/\/onboarding$/, { timeout: 10_000 });

  await ctx2.close();
});
