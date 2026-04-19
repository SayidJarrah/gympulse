import { useNavigate, Link } from 'react-router-dom'
import { AuthForm } from '../../components/auth/AuthForm'
import { useAuthStore } from '../../store/authStore'
import * as authApi from '../../api/auth'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse, AuthUser, UserRole } from '../../types/auth'
import { useState, useCallback } from 'react'

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json) as { sub: string; role: UserRole; email?: string }
    return {
      id: payload.sub,
      email: payload.email ?? '',
      role: payload.role,
    }
  } catch {
    return null
  }
}

function parseValidationErrors(message: string): Record<string, string> | null {
  const parts = message.split(';').map((p) => p.trim())
  const result: Record<string, string> = {}
  let parsed = false
  for (const part of parts) {
    const colonIdx = part.indexOf(':')
    if (colonIdx > 0) {
      const field = part.slice(0, colonIdx).trim()
      const msg = part.slice(colonIdx + 1).trim()
      if (field && msg) {
        result[field] = msg
        parsed = true
      }
    }
  }
  return parsed ? result : null
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setTokens, setUser, setOnboardingCompletedAt } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null)

  const handleSubmit = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setFieldErrors(null)
    try {
      const response = await authApi.register({ email, password })
      // Store tokens (in memory / Zustand persist — never localStorage directly)
      setTokens(response.accessToken, response.refreshToken)
      // Decode JWT to get user identity
      const decoded = decodeJwtPayload(response.accessToken)
      if (decoded) {
        setUser({ ...decoded, email })
      }
      // Mark onboarding as not complete so gate redirects correctly
      setOnboardingCompletedAt(null)
      navigate('/onboarding')
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message = axiosError.response?.data?.error ?? ''
      if (code === 'EMAIL_ALREADY_EXISTS') {
        setError('An account with this email already exists. Please sign in instead.')
      } else if (code === 'VALIDATION_ERROR') {
        const parsed = parseValidationErrors(message)
        if (parsed) {
          setFieldErrors(parsed)
        } else {
          setError(message || 'Validation error.')
        }
      } else {
        setError(message || 'An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [setTokens, setUser, setOnboardingCompletedAt, navigate])

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* Logo mark */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" fill="white" />
            </svg>
          </div>
          {/* Wordmark */}
          <span className="text-3xl font-bold leading-tight text-white">GymFlow</span>
          {/* Page heading */}
          <h1 className="text-xl font-semibold leading-tight text-gray-400">Create your account</h1>
          {/* Navigation link */}
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-green-400 hover:text-green-300 transition-colors duration-200 focus-visible:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl shadow-black/50 px-8 py-10 w-full max-w-md">
          <AuthForm
            mode="register"
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
            fieldErrors={fieldErrors}
          />
        </div>
      </div>
    </div>
  )
}
