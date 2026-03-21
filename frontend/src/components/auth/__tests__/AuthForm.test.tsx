import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthForm } from '../AuthForm'

// The PasswordInput component renders a toggle button with aria-label "Show password".
// Using getByLabelText(/password/i) would match both the input (via <label>Password</label>)
// and that button. We use exact: true to target only the label-linked input.
function getPasswordField() {
  return screen.getByLabelText('Password', { exact: true })
}

describe('AuthForm — register mode', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    onSubmit.mockClear()
  })

  it('renders email and password fields with the correct labels', () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(getPasswordField()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation error when email is empty on submit', async () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for an invalid email format', async () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error when password is shorter than 8 characters', async () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(getPasswordField(), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error when password is longer than 15 characters', async () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(getPasswordField(), 'thispasswordistoolong')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(/at most 15 characters/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with email and password when form is valid', async () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(getPasswordField(), 'password99')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('user@example.com', 'password99')
    })
  })

  it('displays a server-side error banner when error prop is provided', () => {
    render(
      <AuthForm
        mode="register"
        onSubmit={onSubmit}
        isLoading={false}
        error="An account with this email already exists. Please log in."
      />
    )
    expect(
      screen.getByText(/an account with this email already exists/i)
    ).toBeInTheDocument()
  })

  it('disables the submit button while isLoading is true', () => {
    render(
      <AuthForm mode="register" onSubmit={onSubmit} isLoading={true} error={null} />
    )
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})

describe('AuthForm — login mode', () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    onSubmit.mockClear()
  })

  it('renders Sign in button in login mode', () => {
    render(
      <AuthForm mode="login" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('does NOT enforce the 8-character minimum in login mode', async () => {
    render(
      <AuthForm mode="login" onSubmit={onSubmit} isLoading={false} error={null} />
    )
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'abc')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('user@example.com', 'abc')
    })
  })

  it('displays Incorrect email or password error when error prop is set', () => {
    render(
      <AuthForm
        mode="login"
        onSubmit={onSubmit}
        isLoading={false}
        error="Incorrect email or password. Please try again."
      />
    )
    expect(
      screen.getByText(/incorrect email or password/i)
    ).toBeInTheDocument()
  })
})
