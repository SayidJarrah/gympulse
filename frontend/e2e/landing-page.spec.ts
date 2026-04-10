import { test, expect, type Page } from '@playwright/test';

interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
  maxBookingsPerMonth: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

interface UserMembership {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  bookingsUsedThisMonth: number;
  maxBookingsPerMonth: number;
  createdAt: string;
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

function buildPlansPayload(content: MembershipPlan[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: 100,
  };
}

function samplePlan(overrides: Partial<MembershipPlan> = {}): MembershipPlan {
  return {
    id: '00000000-0000-0000-0000-000000000101',
    name: 'Starter Access',
    description: 'A focused monthly membership for regular training.',
    priceInCents: 3900,
    durationDays: 30,
    maxBookingsPerMonth: 8,
    status: 'ACTIVE',
    createdAt: '2026-03-29T09:00:00Z',
    updatedAt: '2026-03-29T09:00:00Z',
    ...overrides,
  };
}

function sampleMembership(overrides: Partial<UserMembership> = {}): UserMembership {
  return {
    id: 'membership-landing-1',
    userId: 'user-landing-1',
    planId: '00000000-0000-0000-0000-000000000101',
    planName: 'Starter Access',
    startDate: '2026-03-29',
    endDate: '2026-04-28',
    status: 'ACTIVE',
    bookingsUsedThisMonth: 1,
    maxBookingsPerMonth: 8,
    createdAt: '2026-03-29T09:00:00Z',
    ...overrides,
  };
}

async function mockLandingPlans(page: Page, plans: MembershipPlan[]) {
  await page.route('**/api/v1/membership-plans**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildPlansPayload(plans)),
    });
  });
}

async function mockNoActiveMembership(page: Page) {
  await page.route('**/api/v1/memberships/me', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'No active membership found.',
        code: 'NO_ACTIVE_MEMBERSHIP',
      }),
    });
  });
}

async function mockActiveMembership(page: Page, membership: UserMembership) {
  await page.route('**/api/v1/memberships/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(membership),
    });
  });
}

async function seedPersistedAuth(page: Page, state: PersistedAuthState) {
  await page.addInitScript((persistedState) => {
    window.localStorage.setItem(
      'gymflow-auth',
      JSON.stringify({ state: persistedState, version: 0 })
    );
  }, state);
}

test.describe('Landing Page', () => {
  test('LAND-01 guest sees the hero and live plan preview on /', async ({ page }) => {
    await mockLandingPlans(page, [samplePlan()]);

    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Join GymFlow' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Starter Access' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join GymFlow' })).toHaveAttribute(
      'href',
      '/register'
    );
  });

  test('LAND-02 guest can navigate to register and login from the landing page', async ({ page }) => {
    await mockLandingPlans(page, [samplePlan()]);

    await page.goto('/');
    await page.getByRole('link', { name: 'Join GymFlow' }).click();
    await expect(page).toHaveURL('/register');

    await page.goto('/');
    await page.locator('header').getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('LAND-03 signed-in user without membership sees /plans as the primary action', async ({ page }) => {
    await mockLandingPlans(page, [samplePlan()]);
    await mockNoActiveMembership(page);
    await seedPersistedAuth(page, {
      accessToken: 'landing-user-token',
      refreshToken: 'landing-user-refresh',
      user: {
        id: 'user-landing-1',
        email: 'landing-user@example.com',
        role: 'USER',
      },
      isAuthenticated: true,
    });

    await page.goto('/');

    await expect(page.getByRole('link', { name: 'View membership plans' })).toHaveAttribute(
      'href',
      '/plans'
    );
  });

  test('LAND-04 signed-in user with membership sees /home as the primary action', async ({ page }) => {
    await mockLandingPlans(page, [samplePlan()]);
    await mockActiveMembership(page, sampleMembership());
    await seedPersistedAuth(page, {
      accessToken: 'landing-active-token',
      refreshToken: 'landing-active-refresh',
      user: {
        id: 'user-landing-1',
        email: 'landing-user@example.com',
        role: 'USER',
      },
      isAuthenticated: true,
    });

    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Go to home' })).toHaveAttribute(
      'href',
      '/home'
    );
  });

  test('LAND-05 plans empty state renders without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await mockLandingPlans(page, []);
    await page.goto('/');

    await expect(page.getByText('Membership plans are being updated')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
