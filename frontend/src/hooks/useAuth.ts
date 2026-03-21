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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { user, isAuthenticated, setTokens, setUser, clearAuth, refreshToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authApi.login({ email, password })
      setTokens(response.accessToken, response.refreshToken)
      const decoded = decodeJwtPayload(response.accessToken)
      if (decoded) {
        // email comes from the form since JWT may not carry it
        setUser({ ...decoded, email })
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      if (code === 'INVALID_CREDENTIALS') {
        setError('Incorrect email or password. Please try again.')
      } else if (code === 'REFRESH_TOKEN_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (code === 'REFRESH_TOKEN_INVALID') {
        setError('Your session is invalid. Please sign in again.')
      } else {
        setError(axiosError.response?.data?.error ?? 'An unexpected error occurred.')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setTokens, setUser])

  const register = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      await authApi.register({ email, password })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      if (code === 'EMAIL_ALREADY_EXISTS') {
        setError('An account with this email already exists. Please log in.')
      } else if (code === 'VALIDATION_ERROR') {
        setError(axiosError.response?.data?.error ?? 'Validation error.')
      } else if (code === 'REFRESH_TOKEN_EXPIRED') {
        setError('Your session has expired. Please sign in again.')
      } else if (code === 'REFRESH_TOKEN_INVALID') {
        setError('Your session is invalid. Please sign in again.')
      } else {
        setError(axiosError.response?.data?.error ?? 'An unexpected error occurred.')
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
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
    login,
    register,
    logout,
  }
}
