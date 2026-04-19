import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../types/auth'

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  onboardingCompletedAt: string | null; // ISO 8601 or null
  bootstrapLoading: boolean; // true while GET /profile/me is in-flight; never persisted

  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  setOnboardingCompletedAt: (ts: string | null) => void;
  setBootstrapLoading: (v: boolean) => void;
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
      // Start as true when already authenticated (hydrated from localStorage),
      // so route guards wait for the bootstrap fetch before deciding.
      bootstrapLoading: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) =>
        set({ user, isAuthenticated: true }),

      setOnboardingCompletedAt: (ts) =>
        set({ onboardingCompletedAt: ts }),

      setBootstrapLoading: (v) =>
        set({ bootstrapLoading: v }),

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          onboardingCompletedAt: null,
          bootstrapLoading: false,
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
        // bootstrapLoading is intentionally excluded — must recompute every session
      }),
      onRehydrateStorage: () => (state) => {
        // After hydration, if the user is authenticated, flag that bootstrap
        // must run before route guards can make decisions.
        if (state?.isAuthenticated) {
          state.bootstrapLoading = true
        }
      },
    }
  )
)
