import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MemberNav } from '../MemberNav'

const mockUseAuthStore = vi.fn()
const mockUseProfileStore = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

vi.mock('../../../store/profileStore', () => ({
  useProfileStore: () => mockUseProfileStore(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderNav() {
  return render(
    <MemoryRouter>
      <MemberNav />
    </MemoryRouter>
  )
}

describe('MemberNav', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockUseAuthStore.mockClear()
    mockUseProfileStore.mockClear()
    mockUseAuthStore.mockReturnValue({
      user: { id: 'u1', email: 'mike@example.com', role: 'USER' },
      clearAuth: vi.fn(),
    })
    mockUseProfileStore.mockReturnValue({
      avatarUrl: null,
      ensureProfileLoaded: vi.fn().mockResolvedValue(undefined),
      resetProfile: vi.fn(),
    })
  })

  it('renders Home link pointing to /home', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home')
  })

  it('renders Classes button', () => {
    renderNav()
    expect(screen.getByRole('button', { name: /classes/i })).toBeInTheDocument()
  })

  it('Classes dropdown is hidden by default', () => {
    renderNav()
    expect(screen.queryByRole('link', { name: 'Group Classes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Personal Training' })).not.toBeInTheDocument()
  })

  it('Classes dropdown opens and shows Group Classes and Personal Training', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: /classes/i }))
    expect(screen.getByRole('link', { name: 'Group Classes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Personal Training' })).toBeInTheDocument()
  })

  it('Group Classes link points to /schedule', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: /classes/i }))
    expect(screen.getByRole('link', { name: 'Group Classes' })).toHaveAttribute('href', '/schedule')
  })

  it('Personal Training link points to /training', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: /classes/i }))
    expect(screen.getByRole('link', { name: 'Personal Training' })).toHaveAttribute('href', '/training')
  })

  it('avatar button opens dropdown with Profile and Log out', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('Log out clears auth and navigates to /login', async () => {
    const { clearAuth } = mockUseAuthStore()
    const { resetProfile } = mockUseProfileStore()
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(clearAuth).toHaveBeenCalledOnce()
    expect(resetProfile).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('does not render a My Favorites link', () => {
    renderNav()
    expect(screen.queryByRole('link', { name: /favorites/i })).not.toBeInTheDocument()
  })

  it('opening avatar dropdown closes the Classes dropdown', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: /classes/i }))
    expect(screen.getByRole('link', { name: 'Group Classes' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.queryByRole('link', { name: 'Group Classes' })).not.toBeInTheDocument()
  })

  it('opening Classes dropdown closes the avatar dropdown', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /classes/i }))
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
  })
})
