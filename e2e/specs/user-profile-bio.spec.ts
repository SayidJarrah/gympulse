import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Happy-path E2E — User Profile: bio field inline-edit with line-break preservation.
 * Reference: docs/product.md §user-profile-management
 *
 * Scenario:
 *   1. New member completes onboarding → lands on /home.
 *   2. Navigates to /profile.
 *   3. Personal Information card is visible; bio row shows "Add a short bio" placeholder.
 *   4. Clicks "Edit" on the bio row.
 *   5. Types a two-line bio (contains a newline).
 *   6. Clicks Save — PUT /profile/me fires and returns 200.
 *   7. Bio row leaves edit mode; the saved text is displayed with whitespace-pre-line
 *      rendering (both lines visible, line break preserved).
 *
 * Key assertions:
 *   - PUT /api/v1/profile/me fires with bio payload on save.
 *   - Response status 200.
 *   - Bio display element contains both lines of text.
 */

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

/**
 * Register a fresh member via onboarding, skip optional steps, and land on /home.
 * Returns authenticated page with valid session cookies.
 */
async function registerAndCompleteOnboarding(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Sub-lg viewport — mobile step tree wins the imperative ref.
  await page.setViewportSize({ width: 800, height: 1100 });

  await page.goto('/');
  await page.getByRole('link', { name: /join gymflow/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  // Step 1 — Credentials
  await expect(page.getByLabel(/email/i).locator('visible=true').first()).toBeVisible();
  await page.getByLabel(/email/i).locator('visible=true').first().fill(email);
  await page.getByLabel(/password/i).locator('visible=true').first().fill(password);
  await page.getByRole('button', { name: /^continue/i }).click();

  // Step 2 — Profile
  await expect(
    page.getByRole('heading', { name: /your profile/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByLabel(/^first name/i).locator('visible=true').fill('Bio');
  await page.getByLabel(/^last name/i).locator('visible=true').fill('Tester');
  await page.getByLabel(/^phone/i).locator('visible=true').fill('+15550300001');
  await fillDateOfBirth(page, '1992-03-15');
  await page.getByRole('button', { name: /^continue/i }).click();

  // Step 3 — Terms (register fires here)
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

  // Step 4 — Preferences — skip
  await expect(
    page.getByRole('heading', { name: /preferences/i }).locator('visible=true'),
  ).toBeVisible();
  await page.getByRole('button', { name: /skip this step/i }).click();

  // Step 5 — Membership — skip (no plan selected; booking step is auto-skipped)
  await expect(
    page.getByRole('heading', { name: /choose a plan/i }).locator('visible=true'),
  ).toBeVisible();

  // Wire completeResponsePromise BEFORE the membership skip that transitions
  // straight to Done (when no plan is selected, the booking step is omitted
  // from visibleSteps). StepDone fires POST /onboarding/complete on mount.
  const completeResponsePromise = page.waitForResponse(
    r => r.url().includes('/onboarding/complete') && r.status() === 200,
  );

  await page.getByRole('button', { name: /skip this step/i }).click();

  // Done screen
  await expect(
    page.getByRole('heading', { name: /welcome to the flow/i }),
  ).toBeVisible();
  await completeResponsePromise;

  await page.getByRole('button', { name: /enter gymflow/i }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test('bio field: new member sets a multi-line bio, sees it persisted with line breaks', async ({ page }) => {
  const email = `bio-${randomUUID()}@test.gympulse.local`;
  const password = 'Test12345';

  // ── Register + complete onboarding ───────────────────────────────────────
  await registerAndCompleteOnboarding(page, email, password);

  // Widen to full desktop so profile page layout is comfortable.
  await page.setViewportSize({ width: 1280, height: 900 });

  // ── Navigate to /profile ──────────────────────────────────────────────────
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/profile/);

  // Personal Information card must be visible
  const personalInfoCard = page.getByText(/personal information/i).first();
  await expect(personalInfoCard).toBeVisible();

  // Bio row shows placeholder when bio is empty
  const bioPlaceholder = page.getByText(/add a short bio/i);
  await expect(bioPlaceholder).toBeVisible();

  // ── Open edit mode ────────────────────────────────────────────────────────
  await page.getByRole('button', { name: /edit bio/i }).click();

  // Textarea is focused / visible
  const bioTextarea = page.getByRole('textbox', { name: /bio/i });
  await expect(bioTextarea).toBeVisible();

  // ── Type a multi-line bio ─────────────────────────────────────────────────
  const line1 = 'Passionate about strength training and yoga.';
  const line2 = 'Training since 2018.';
  await bioTextarea.fill(`${line1}\n${line2}`);

  // ── Save — assert PUT /profile/me fires and returns 200 ──────────────────
  const profilePutPromise = page.waitForResponse(
    r => r.url().includes('/profile/me') && r.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: /^save$/i }).click();
  const profilePutResponse = await profilePutPromise;
  expect(profilePutResponse.status()).toBe(200);

  // Confirm bio was included in the request body
  const requestBody = profilePutResponse.request().postDataJSON() as Record<string, unknown>;
  expect(typeof requestBody.bio).toBe('string');
  expect((requestBody.bio as string).includes(line1)).toBe(true);
  expect((requestBody.bio as string).includes(line2)).toBe(true);

  // ── Edit mode collapses; bio text is displayed ────────────────────────────
  // Textarea should be gone
  await expect(bioTextarea).not.toBeVisible();

  // Both lines of text are rendered in the display area
  // (whitespace-pre-line CSS means the newline produces visible separate lines in DOM)
  const bioDisplay = page.locator('.whitespace-pre-line').filter({ hasText: line1 });
  await expect(bioDisplay).toBeVisible();
  await expect(bioDisplay).toContainText(line2);

  // Toast confirmation
  await expect(page.getByText(/bio updated/i)).toBeVisible();
});
