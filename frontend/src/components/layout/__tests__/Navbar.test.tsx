import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from '../Navbar'

const mockUseAuthStore = vi.fn()
const mockUseProfileStore = vi.fn()

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

vi.mock('../../../store/profileStore', () => ({
  useProfileStore: () => mockUseProfileStore(),
}))

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    mockUseProfileStore.mockReturnValue({
      avatarUrl: null,
      ensureProfileLoaded: vi.fn(),
      resetProfile: vi.fn(),
    })
  })

  it('keeps the public Plans link for guests', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
      clearAuth: vi.fn(),
    })

    renderNavbar()

    expect(screen.getByRole('link', { name: 'Plans' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('removes Plans from authenticated user nav on desktop and mobile', async () => {
    const user = userEvent.setup()

    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'member@example.com', role: 'USER' },
      clearAuth: vi.fn(),
    })

    renderNavbar()

    expect(screen.queryByRole('link', { name: 'Plans' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trainers' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toggle menu' }))

    expect(screen.queryByRole('link', { name: 'Plans' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(1)
  })
})
