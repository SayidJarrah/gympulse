import { create } from 'zustand'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/auth'
import type { UserProfile, UpdateUserProfileRequest } from '../types/userProfile'
import { getMyProfile, updateMyProfile } from '../api/profile'
import { getProfileErrorMessage } from '../utils/profileErrors'

export type ProfileFieldName =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'dateOfBirth'
  | 'fitnessGoals'
  | 'preferredClassTypes'

type ProfileFieldErrors = Partial<Record<ProfileFieldName, string>>

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fieldErrors: ProfileFieldErrors;
  successMessage: string | null;
  fetchMyProfile: () => Promise<void>;
  saveMyProfile: (req: UpdateUserProfileRequest) => Promise<void>;
  clearMessages: () => void;
}

const FIELD_ERROR_CODES: Partial<Record<string, ProfileFieldName>> = {
  INVALID_FIRST_NAME: 'firstName',
  INVALID_LAST_NAME: 'lastName',
  INVALID_PHONE: 'phone',
  INVALID_DATE_OF_BIRTH: 'dateOfBirth',
  INVALID_FITNESS_GOALS: 'fitnessGoals',
  INVALID_PREFERRED_CLASS_TYPES: 'preferredClassTypes',
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  isSaving: false,
  error: null,
  fieldErrors: {},
  successMessage: null,

  fetchMyProfile: async () => {
    set({ isLoading: true, error: null, fieldErrors: {}, successMessage: null })

    try {
      const profile = await getMyProfile()
      set({ profile, isLoading: false })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      set({
        isLoading: false,
        error: getProfileErrorMessage(code, 'Failed to load your profile.'),
      })
    }
  },

  saveMyProfile: async (req) => {
    set({
      isSaving: true,
      error: null,
      fieldErrors: {},
      successMessage: null,
    })

    try {
      const profile = await updateMyProfile(req)
      set({
        profile,
        isSaving: false,
        successMessage: 'Profile updated.',
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const field = FIELD_ERROR_CODES[code]

      if (field) {
        set({
          isSaving: false,
          fieldErrors: {
            [field]: getProfileErrorMessage(code, 'Please review this field.'),
          },
        })
        return
      }

      set({
        isSaving: false,
        error: getProfileErrorMessage(code, 'Failed to update your profile.'),
      })
    }
  },

  clearMessages: () => set({ error: null, fieldErrors: {}, successMessage: null }),
}))
