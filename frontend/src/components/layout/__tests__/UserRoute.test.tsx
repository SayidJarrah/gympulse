import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { UserRoute } from '../UserRoute'

const mockUseAuthStore = vi.fn()

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

function renderRoute(initialEntry = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/home"
          element={
            <UserRoute>
              <div>Member home</div>
            </UserRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/admin/plans" element={<div>Admin plans</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('UserRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
    })

    renderRoute()

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('redirects admins to /admin/plans', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
    })

    renderRoute()

    expect(screen.getByText('Admin plans')).toBeInTheDocument()
  })

  it('renders children for authenticated members', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'member@example.com', role: 'USER' },
    })

    renderRoute()

    expect(screen.getByText('Member home')).toBeInTheDocument()
  })
})
