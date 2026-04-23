import { useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import * as authApi from '../api/auth'
import type { AuthUser, UserRole } from '../types/auth'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/auth'

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64url decode: replace URL-safe chars and pad
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

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  fieldErrors: Record<string, string> | null;
  login: (email: string, password: string) => Promise<{ hasActiveMembership: boolean }>;
  logout: () => Promise<void>;
}

/**
 * Parses a VALIDATION_ERROR message of the form "field: msg; field2: msg2"
 * into a field-keyed record. Falls back to null if the format doesn't match.
 */
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

export function useAuth(): UseAuthReturn {
  const { user, isAuthenticated, setTokens, setUser, clearAuth, refreshToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null)

  const login = useCallback(async (email: string, password: string): Promise<{ hasActiveMembership: boolean }> => {
    setIsLoading(true)
    setError(null)
    setFieldErrors(null)
    try {
      const response = await authApi.login({ email, password })
      setTokens(response.accessToken, response.refreshToken)
      const decoded = decodeJwtPayload(response.accessToken)
      if (decoded) {
        // email comes from the form since JWT may not carry it
        setUser({ ...decoded, email })
      }
      return { hasActiveMembership: response.hasActiveMembership }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message = axiosError.response?.data?.error ?? ''
      if (code === 'VALIDATION_ERROR') {
        const parsed = parseValidationErrors(message)
        if (parsed) {
          setFieldErrors(parsed)
        } else {
          setError(message || 'Validation error.')
        }
      } else if (code === 'INVALID_CREDENTIALS') {
        setError('Incorrect email or password. Please try again.')
      } else if (code === 'REFRESH_TOKEN_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (code === 'REFRESH_TOKEN_INVALID') {
        setError('Your session is invalid. Please sign in again.')
      } else {
        setError(message || 'An unexpected error occurred.')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setTokens, setUser])

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setFieldErrors(null)
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken)
      }
    } catch {
      // Even if the server call fails, we still clear local auth state
    } finally {
      clearAuth()
      setIsLoading(false)
    }
  }, [refreshToken, clearAuth])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    fieldErrors,
    login,
    logout,
  }
}
