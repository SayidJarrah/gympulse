import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * E2E — Onboarding: abandonment behavior (two test cases).
 * Reference: docs/sdd/onboarding-terms-early.md §5.2
 *
 * Wizard step order: credentials → profile → terms → preferences →
 *   membership → booking → done.
 *
 * Test A — pre-terms abandonment leaves no server trace.
 *   Guest fills credentials + profile but does NOT submit terms (register never fires).
 *   A fresh browser context registers successfully with the SAME email via the wizard.
 *   Assertion: second register returns 201, not 409 (no ghost account created).
 *
 * Test B — post-terms abandonment resumes at the correct step.
 *   Guest runs wizard through the terms step (register fires → 201) and lands on the
 *   membership step. Browser context is closed before completing. A fresh context
 *   logs in via /login with the same credentials. User is funnelled to /onboarding
 *   and lands on the booking step (heading "Book your first session").
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

test('pre-terms abandonment: same email re-registers successfully (no ghost account)', async ({ browser }) => {
  const email = `abandon-pre-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // ── Context 1: abandon before terms ──────────────────────────────────────
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await page1.setViewportSize({ width: 800, height: 1100 });

  await page1.goto('/');
  await page1.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page1).toHaveURL(/\/onboarding$/);

  await expect(page1.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page1.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page1.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page1.getByRole('button', { name: /^continue/i }).click();

  await expect(
    page1.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page1.getByLabel(/^first name/i).locator('visible=true').fill('Ghost');
  await page1.getByLabel(/^last name/i).locator('visible=true').fill('User');
  await page1.getByLabel(/^phone/i).locator('visible=true').fill('+15550611001');
  await fillDateOfBirth(page1, '1992-02-28');

  // Stop here — do NOT continue past profile. Close the browser context.
  await ctx1.close();

  // ── Context 2: same email, full wizard, should succeed (not 409) ──────────
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.setViewportSize({ width: 800, height: 1100 });

  await page2.goto('/');
  await page2.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page2).toHaveURL(/\/onboarding$/);

  await expect(page2.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page2.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page2.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page2.getByRole('button', { name: /^continue/i }).click();

  await expect(
    page2.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page2.getByLabel(/^first name/i).locator('visible=true').fill('Real');
  await page2.getByLabel(/^last name/i).locator('visible=true').fill('User');
  await page2.getByLabel(/^phone/i).locator('visible=true').fill('+15550611002');
  await fillDateOfBirth(page2, '1992-02-28');
  await page2.getByRole('button', { name: /^continue/i }).click();

  await expect(
    page2.getByRole('heading', { name: /final check/i }).locator('visible=true'),
  ).toBeVisible();
  await page2.getByRole('checkbox', { name: /terms of use/i }).locator('visible=true').click();
  await page2
    .getByRole('checkbox', { name: /health and liability waiver/i })
    .locator('visible=true')
    .click();

  // Second register must return 201, not 409 (no ghost account from context 1)
  const registerResponsePromise = page2.waitForResponse(
    r => r.url().includes('/auth/register'),
  );
  await page2.getByRole('button', { name: /finish onboarding/i }).click();

  const registerResponse = await registerResponsePromise;
  expect(registerResponse.status()).toBe(201);

  await ctx2.close();
});

test('post-terms abandonment: resume via login funnels to /onboarding at booking step', async ({ browser }) => {
  const email = `abandon-post-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345'; // 9 chars — satisfies 8–15 backend rule

  // ── Context 1: run through terms + pick a plan, then abandon ─────────────
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
  await page1.getByLabel(/^first name/i).locator('visible=true').fill('Resumed');
  await page1.getByLabel(/^last name/i).locator('visible=true').fill('User');
  await page1.getByLabel(/^phone/i).locator('visible=true').fill('+15550711001');
  await fillDateOfBirth(page1, '1991-06-14');
  await page1.getByRole('button', { name: /^continue/i }).click();

  // Terms — register fires here
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

  // Preferences — skip
  await expect(
    page1.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();
  await page1.getByRole('button', { name: /skip this step/i }).click();

  // Membership — pick a plan (advances to booking step), then close context
  await expect(
    page1.getByRole('heading', { name: /choose a plan/i }).locator('visible=true'),
  ).toBeVisible();
  await expect(page1.getByRole('button', { name: /select plan/i }).first()).toBeVisible();
  await page1.getByRole('button', { name: /select plan/i }).first().click();
  await expect(page1.getByRole('button', { name: /^selected$/i }).first()).toBeVisible();

  const planPendingResponsePromise = page1.waitForResponse(
    r => r.url().includes('/onboarding/plan-pending') && r.status() === 201,
  );
  await page1.getByRole('button', { name: /^continue/i }).click();
  await planPendingResponsePromise;

  // Confirm we are at the booking step, then abandon
  await expect(
    page1.getByRole('heading', { name: /book your first session/i }).locator('visible=true'),
  ).toBeVisible();

  // Close the browser context — abandonment
  await ctx1.close();

  // ── Context 2: log in with same credentials, expect /onboarding at booking ─
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.setViewportSize({ width: 800, height: 1100 });

  await page2.goto('/login');
  await expect(page2).toHaveURL(/\/login$/);

  await page2.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page2.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page2.getByRole('button', { name: /log in|sign in/i }).click();

  // User has started onboarding but not completed — should be funnelled to /onboarding
  await expect(page2).toHaveURL(/\/onboarding$/, { timeout: 10_000 });

  // The booking step heading should be visible (resume at the correct step)
  await expect(
    page2.getByRole('heading', { name: /book your first session/i }).locator('visible=true'),
  ).toBeVisible();

  await ctx2.close();
});
