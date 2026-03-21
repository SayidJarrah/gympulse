import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RegisterPage } from '../RegisterPage'

// Mock useAuth hook
const mockRegister = vi.fn()
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

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockNavigate.mockReset()
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: null,
    })
  })

  it('renders the registration heading and the AuthForm', () => {
    renderRegisterPage()
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: /register form/i })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    renderRegisterPage()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('calls register and navigates to /login on successful submission', async () => {
    mockRegister.mockResolvedValueOnce(undefined)

    renderRegisterPage()

    await userEvent.type(screen.getByLabelText(/email address/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'password99')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('alice@example.com', 'password99')
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('does NOT navigate when register throws an error', async () => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: 'An account with this email already exists. Please log in.',
    })
    mockRegister.mockRejectedValueOnce(new Error('EMAIL_ALREADY_EXISTS'))

    renderRegisterPage()

    await userEvent.type(screen.getByLabelText(/email address/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'password99')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('displays the server-side error message from useAuth', () => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: 'An account with this email already exists. Please log in.',
    })

    renderRegisterPage()

    expect(
      screen.getByText(/an account with this email already exists/i)
    ).toBeInTheDocument()
  })

  it('shows the loading state on the submit button when isLoading is true', () => {
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: true,
      error: null,
    })

    renderRegisterPage()

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})
