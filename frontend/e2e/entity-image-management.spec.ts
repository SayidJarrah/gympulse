import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080/api/v1';
const ADMIN_EMAIL = 'admin@gymflow.local';
const ADMIN_PASSWORD = 'Admin@1234';
const USER_PASSWORD = 'Member@1234';
const ONE_BY_ONE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sotM7sAAAAASUVORK5CYII=';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  role: 'USER' | 'ADMIN';
}

interface PersistedAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
  } | null;
  isAuthenticated: boolean;
}

interface PaginatedResponse<T> {
  content: T[];
}

interface MembershipPlanSummary {
  id: string;
  name: string;
}

interface ClassTemplateSummary {
  id: string;
  name: string;
}

interface ClassInstanceResponse {
  id: string;
  name: string;
}

function uniqueValue(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueEmail(prefix: string): string {
  return `${uniqueValue(prefix)}@example.com`;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function decodeJwtPayload(token: string): JwtPayload {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as JwtPayload;
}

function buildPersistedAuthState(
  email: string,
  accessToken: string,
  refreshToken: string
): PersistedAuthState {
  const payload = decodeJwtPayload(accessToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: payload.sub,
      email,
      role: payload.role,
    },
    isAuthenticated: true,
  };
}

function pngUploadPayload(name: string) {
  return {
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(ONE_BY_ONE_PNG, 'base64'),
  };
}

async function registerViaApi(
  request: APIRequestContext,
  email: string,
  password = USER_PASSWORD
): Promise<void> {
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: { email, password },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<LoginResponse>;
}

async function setPersistedAuth(page: Page, state: PersistedAuthState): Promise<void> {
  await page.goto('/');
  await page.evaluate((persistedState) => {
    window.localStorage.setItem(
      'gymflow-auth',
      JSON.stringify({ state: persistedState, version: 0 })
    );
  }, state);
}

async function createUserSession(
  request: APIRequestContext,
  prefix: string
): Promise<{ email: string; accessToken: string; refreshToken: string }> {
  const email = uniqueEmail(prefix);
  await registerViaApi(request, email, USER_PASSWORD);
  const session = await loginViaApi(request, email, USER_PASSWORD);

  return {
    email,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

async function getFirstActivePlan(request: APIRequestContext): Promise<MembershipPlanSummary> {
  const response = await request.get(`${API_BASE}/membership-plans?page=0&size=20`);
  expect(response.ok(), await response.text()).toBeTruthy();

  const payload = await response.json() as PaginatedResponse<MembershipPlanSummary>;
  expect(payload.content.length).toBeGreaterThan(0);
  return payload.content[0];
}

async function purchaseMembershipViaApi(
  request: APIRequestContext,
  accessToken: string,
  planId: string
): Promise<void> {
  const response = await request.post(`${API_BASE}/memberships`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { planId },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

async function getTemplateByNameViaApi(
  request: APIRequestContext,
  accessToken: string,
  templateName: string
): Promise<ClassTemplateSummary> {
  const response = await request.get(
    `${API_BASE}/admin/class-templates?search=${encodeURIComponent(templateName)}&page=0&size=20`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json() as PaginatedResponse<ClassTemplateSummary>;
  const template = payload.content.find((item) => item.name === templateName);

  expect(template, `Class template ${templateName} was not found via API`).toBeTruthy();
  return template!;
}

async function createClassInstanceViaApi(
  request: APIRequestContext,
  accessToken: string,
  payload: {
    templateId: string;
    name: string;
    scheduledAt: string;
    durationMin: number;
    capacity: number;
  }
): Promise<ClassInstanceResponse> {
  const response = await request.post(`${API_BASE}/admin/class-instances`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      templateId: payload.templateId,
      name: payload.name,
      scheduledAt: payload.scheduledAt,
      durationMin: payload.durationMin,
      capacity: payload.capacity,
      roomId: null,
      trainerIds: [],
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json() as Promise<ClassInstanceResponse>;
}

async function deleteClassInstanceViaApi(
  request: APIRequestContext,
  accessToken: string,
  instanceId: string
): Promise<void> {
  const response = await request.delete(`${API_BASE}/admin/class-instances/${instanceId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

async function openTrainerProfileFromList(page: Page, trainerName: string): Promise<void> {
  let currentPage = 1;

  for (;;) {
    const trainerLink = page.getByRole('link', { name: trainerName }).first();
    if (await trainerLink.count()) {
      await expect(trainerLink).toBeVisible();
      await trainerLink.click();
      return;
    }

    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeVisible();
    if (await nextButton.isDisabled()) {
      throw new Error(`Trainer ${trainerName} was not found in discovery pagination`);
    }

    await nextButton.click();
    currentPage += 1;
    await expect(page.getByText(new RegExp(`^Page ${currentPage} of \\d+$`))).toBeVisible();
  }
}

function modalActionButton(page: Page, name: string): Locator {
  return page.getByRole('dialog').getByRole('button', { name, exact: true });
}

async function clickVisible(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect(locator).toBeEnabled();
  await locator.evaluate((element: HTMLElement) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    element.click();
  });
}

test.describe('Entity Image Management', () => {
  test('IMG-01 member uploads and removes a profile photo with navbar sync', async ({ page, request }) => {
    const userSession = await createUserSession(request, 'e2e-image-profile');
    await setPersistedAuth(
      page,
      buildPersistedAuthState(
        userSession.email,
        userSession.accessToken,
        userSession.refreshToken
      )
    );

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();

    await page.locator('#profile-photo').setInputFiles(pngUploadPayload('profile-photo.png'));
    await expect(page.getByText('Ready to upload after save.')).toBeVisible();

    await page.fill('#profile-first-name', 'Ava');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();

    await expect(page.getByText('Profile updated. Photo updated.')).toBeVisible();
    await page.goto('/plans');
    await expect(page.getByAltText('Your profile')).toBeVisible();

    await page.goto('/profile');
    const photoSection = page.locator('section').filter({ hasText: 'Profile photo' }).first();
    const dialogPromise = page.waitForEvent('dialog');
    await photoSection.getByRole('button', { name: 'Remove' }).click();
    const dialog = await dialogPromise;
    await dialog.accept();

    await expect(page.getByText('Photo removed.')).toBeVisible();
    await page.goto('/plans');
    await expect(page.getByAltText('Your profile')).toHaveCount(0);
  });

  test('IMG-02 uploaded trainer photos render in member-facing trainer profiles', async ({ page, request }) => {
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setPersistedAuth(
      page,
      buildPersistedAuthState(ADMIN_EMAIL, adminSession.accessToken, adminSession.refreshToken)
    );

    const suffix = uniqueValue('trainer-photo');
    const firstName = `Image${suffix}`;
    const lastName = `Coach${suffix}`;
    const trainerName = `${firstName} ${lastName}`;
    const email = uniqueEmail('trainer-photo');

    await page.goto('/admin/trainers');
    await page.getByRole('button', { name: 'Add Trainer' }).click();
    await page.fill('#trainer-first-name', firstName);
    await page.fill('#trainer-last-name', lastName);
    await page.fill('#trainer-email', email);
    await page.locator('#trainer-photo').setInputFiles(pngUploadPayload('trainer-photo.png'));
    await expect(page.getByText('Ready to upload after save.')).toBeVisible();
    await clickVisible(modalActionButton(page, 'Save Trainer'));

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByPlaceholder('Search by name or email').fill(email);
    await page.waitForTimeout(400);
    await expect(page.getByAltText(trainerName).first()).toBeVisible();

    const memberSession = await createUserSession(request, 'e2e-image-trainer-member');
    const plan = await getFirstActivePlan(request);
    await purchaseMembershipViaApi(request, memberSession.accessToken, plan.id);
    await setPersistedAuth(
      page,
      buildPersistedAuthState(
        memberSession.email,
        memberSession.accessToken,
        memberSession.refreshToken
      )
    );

    await page.goto('/trainers');
    await expect(page.getByRole('heading', { name: 'Trainer Discovery' })).toBeVisible();
    await openTrainerProfileFromList(page, trainerName);
    await expect(page.getByRole('heading', { name: trainerName })).toBeVisible();
    await expect(page.getByAltText(trainerName).first()).toBeVisible();
  });

  test('IMG-03 uploaded room photos render in the admin rooms list', async ({ page, request }) => {
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setPersistedAuth(
      page,
      buildPersistedAuthState(ADMIN_EMAIL, adminSession.accessToken, adminSession.refreshToken)
    );

    const roomName = `Studio ${uniqueValue('image-room')}`;

    await page.goto('/admin/rooms');
    await page.getByRole('button', { name: 'Add Room' }).click();
    await page.fill('#room-name', roomName);
    await page.fill('#room-capacity', '18');
    await page.locator('#room-photo').setInputFiles(pngUploadPayload('room-photo.png'));
    await expect(page.getByText('Ready to upload after save.')).toBeVisible();
    await clickVisible(modalActionButton(page, 'Save Room'));

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('row', { name: new RegExp(roomName) }).getByAltText(roomName)).toBeVisible();
  });

  test('IMG-04 uploaded class template images render in member schedule cards', async ({ page, request }) => {
    const adminSession = await loginViaApi(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    await setPersistedAuth(
      page,
      buildPersistedAuthState(ADMIN_EMAIL, adminSession.accessToken, adminSession.refreshToken)
    );

    const templateName = `Image Class ${uniqueValue('template')}`;

    await page.goto('/admin/class-templates');
    await page.getByRole('button', { name: 'Add Template' }).click();
    await page.fill('#template-name', templateName);
    await page.locator('#class-template-photo').setInputFiles(
      pngUploadPayload('class-template-photo.png')
    );
    await expect(page.getByText('Ready to upload after save.')).toBeVisible();
    await clickVisible(modalActionButton(page, 'Save Template'));
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const template = await getTemplateByNameViaApi(request, adminSession.accessToken, templateName);
    const anchorDate = formatIsoDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const instance = await createClassInstanceViaApi(request, adminSession.accessToken, {
      templateId: template.id,
      name: templateName,
      scheduledAt: `${anchorDate}T12:00:00Z`,
      durationMin: 45,
      capacity: 20,
    });

    const memberSession = await createUserSession(request, 'e2e-image-schedule-member');
    const plan = await getFirstActivePlan(request);
    await purchaseMembershipViaApi(request, memberSession.accessToken, plan.id);
    await setPersistedAuth(
      page,
      buildPersistedAuthState(
        memberSession.email,
        memberSession.accessToken,
        memberSession.refreshToken
      )
    );

    await page.goto(`/schedule?view=list&date=${anchorDate}`);
    await expect(page.getByRole('heading', { name: 'Group Classes' })).toBeVisible();

    const entryCard = page.locator('button').filter({ hasText: templateName }).first();
    await expect(entryCard).toBeVisible();
    await expect(entryCard.locator('img')).toBeVisible();

    await entryCard.click();
    await expect(page.getByRole('dialog', { name: templateName }).locator('img')).toBeVisible();

    await deleteClassInstanceViaApi(request, adminSession.accessToken, instance.id);
  });
});
