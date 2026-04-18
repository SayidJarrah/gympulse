import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  onboardingCompletedAt: string | null; // ISO 8601 or null

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setOnboardingCompletedAt: (ts: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      onboardingCompletedAt: null,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) =>
        set({ user, isAuthenticated: true }),

      setOnboardingCompletedAt: (ts) =>
        set({ onboardingCompletedAt: ts }),

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          onboardingCompletedAt: null,
        }),
    }),
    {
      name: 'gymflow-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompletedAt: state.onboardingCompletedAt,
      }),
    }
  )
)
