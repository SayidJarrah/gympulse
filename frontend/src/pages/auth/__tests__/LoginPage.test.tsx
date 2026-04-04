import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import { useAuthStore } from '../../../store/authStore'

// Mock useAuth hook
const mockLogin = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
    })
  })

  it('renders the sign-in heading and the AuthForm', () => {
    renderLoginPage()
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument()
  })

  it('renders a link to the register page', () => {
    renderLoginPage()
    expect(screen.getByRole('link', { name: /register/i })).toHaveAttribute('href', '/register')
  })

  it('calls login and navigates to /home on successful member submission', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    useAuthStore.setState({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'user-1', email: 'alice@example.com', role: 'USER' },
      isAuthenticated: true,
    })

    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email address/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'password99')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice@example.com', 'password99')
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/home')
    })
  })

  it('navigates admins to /admin/plans on successful submission', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    useAuthStore.setState({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
      isAuthenticated: true,
    })

    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email address/i), 'admin@example.com')
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'password99')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/plans')
    })
  })

  it('does NOT navigate to /home when login throws an error', async () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Incorrect email or password. Please try again.',
    })
    mockLogin.mockRejectedValueOnce(new Error('INVALID_CREDENTIALS'))

    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/email address/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('displays the Incorrect credentials error from useAuth', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Incorrect email or password. Please try again.',
    })

    renderLoginPage()

    expect(
      screen.getByText(/incorrect email or password/i)
    ).toBeInTheDocument()
  })

  it('shows the loading state on the submit button when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
    })

    renderLoginPage()

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })

  it('shows email and password validation errors when the form is submitted empty', async () => {
    renderLoginPage()

    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    expect(mockLogin).not.toHaveBeenCalled()
  })
})
