import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { LoginResponse, RefreshRequest } from '../types/auth'

const axiosInstance = axios.create({
  baseURL: '/api/v1',
})

// Request interceptor: attach access token from store
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    if (config.headers && config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type')
      } else {
        delete config.headers['Content-Type']
        delete config.headers['content-type']
      }
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error)
)

// Track whether a refresh is in progress to prevent multiple concurrent refresh calls
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processPendingRequests(token: string | null, error: unknown = null): void {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token)
    } else {
      reject(error)
    }
  })
  pendingRequests = []
}

// Response interceptor: silent token refresh on 401
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Auth endpoints manage their own session state — propagate errors directly
    const AUTH_PASSTHROUGH = ['/auth/login', '/auth/register']
    if (AUTH_PASSTHROUGH.some(path => originalRequest.url === path)) {
      return Promise.reject(error)
    }

    // Refresh endpoint failure means the session is dead — log out and redirect
    if (originalRequest.url === '/auth/refresh') {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue the request until the refresh completes
      return new Promise<AxiosResponse>((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(axiosInstance(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const { refreshToken } = useAuthStore.getState()

    if (!refreshToken) {
      isRefreshing = false
      // Only redirect to /login when a previously-valid session has died.
      // For unauthenticated visitors (e.g. guests in the onboarding wizard
      // hitting an authed endpoint by accident), reject silently and let the
      // caller decide what to do — bouncing them out of the flow is wrong.
      if (useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    try {
      // Use a plain axios call to avoid circular dependency with auth.ts.
      // The full path must be spelled out here because axiosInstance cannot be used
      // (it would re-enter this interceptor). The base path is taken from the same
      // value as axiosInstance.defaults.baseURL so it stays in one place.
      const refreshPayload: RefreshRequest = { refreshToken }
      const apiBase = axiosInstance.defaults.baseURL ?? '/api/v1'
      const response = await axios.post<LoginResponse>(`${apiBase}/auth/refresh`, refreshPayload, {
        headers: { 'Content-Type': 'application/json' },
      })

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data

      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken)

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      }

      processPendingRequests(newAccessToken)
      isRefreshing = false

      return axiosInstance(originalRequest)
    } catch (refreshError) {
      processPendingRequests(null, refreshError)
      isRefreshing = false
      // Same rule as above: only redirect when a previously-valid session
      // has died. Always clear auth so the dead refresh token is wiped.
      const wasAuthenticated = useAuthStore.getState().isAuthenticated
      useAuthStore.getState().clearAuth()
      if (wasAuthenticated) {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    }
  }
)

export default axiosInstance
