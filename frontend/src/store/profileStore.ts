import { create } from 'zustand'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/auth'
import type { UserProfile, UpdateUserProfileRequest } from '../types/userProfile'
import {
  deleteMyProfilePhoto,
  getMyProfile,
  getMyProfilePhotoBlob,
  updateMyProfile,
  uploadMyProfilePhoto,
} from '../api/profile'
import { getProfileErrorMessage } from '../utils/profileErrors'
import { revokeObjectUrl } from '../utils/entityImage'

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
  avatarUrl: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fieldErrors: ProfileFieldErrors;
  successMessage: string | null;
  fetchMyProfile: () => Promise<void>;
  saveMyProfile: (req: UpdateUserProfileRequest) => Promise<void>;
  uploadPhoto: (file: File) => Promise<void>;
  deletePhoto: () => Promise<void>;
  ensureProfileLoaded: () => Promise<void>;
  resetProfile: () => void;
  setSuccessMessage: (message: string | null) => void;
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
  avatarUrl: null,
  isLoading: false,
  isSaving: false,
  error: null,
  fieldErrors: {},
  successMessage: null,

  fetchMyProfile: async () => {
    set({ isLoading: true, error: null, fieldErrors: {}, successMessage: null })

    try {
      const profile = await getMyProfile()
      const currentAvatar = useProfileStore.getState().avatarUrl
      const nextAvatar = await loadAvatarUrl(profile, currentAvatar)
      set({ profile, avatarUrl: nextAvatar, isLoading: false })
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
      const currentAvatar = useProfileStore.getState().avatarUrl
      const nextAvatar = await loadAvatarUrl(profile, currentAvatar)
      set({
        profile,
        avatarUrl: nextAvatar,
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

  uploadPhoto: async (file) => {
    set({ isSaving: true, error: null, successMessage: null })

    try {
      await uploadMyProfilePhoto(file)
      const profile = await getMyProfile()
      const currentAvatar = useProfileStore.getState().avatarUrl
      const nextAvatar = await loadAvatarUrl(profile, currentAvatar)
      set({
        profile,
        avatarUrl: nextAvatar,
        isSaving: false,
        successMessage: 'Photo updated.',
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      set({
        isSaving: false,
        error: getProfileErrorMessage(code, 'Upload failed. Try again.'),
      })
      throw err
    }
  },

  deletePhoto: async () => {
    set({ isSaving: true, error: null, successMessage: null })

    try {
      await deleteMyProfilePhoto()
      const profile = await getMyProfile()
      revokeObjectUrl(useProfileStore.getState().avatarUrl)
      set({
        profile,
        avatarUrl: null,
        isSaving: false,
        successMessage: 'Photo removed.',
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      set({
        isSaving: false,
        error: getProfileErrorMessage(code, 'Failed to remove your photo.'),
      })
      throw err
    }
  },

  ensureProfileLoaded: async () => {
    const { profile, isLoading } = useProfileStore.getState()
    if (profile || isLoading) {
      return
    }
    await useProfileStore.getState().fetchMyProfile()
  },

  resetProfile: () => {
    revokeObjectUrl(useProfileStore.getState().avatarUrl)
    set({
      profile: null,
      avatarUrl: null,
      isLoading: false,
      isSaving: false,
      error: null,
      fieldErrors: {},
      successMessage: null,
    })
  },

  setSuccessMessage: (message) => set({ successMessage: message }),

  clearMessages: () => set({ error: null, fieldErrors: {}, successMessage: null }),
}))

async function loadAvatarUrl(profile: UserProfile, currentAvatar: string | null): Promise<string | null> {
  if (!profile.hasProfilePhoto || !profile.profilePhotoUrl) {
    revokeObjectUrl(currentAvatar)
    return null
  }

  const blob = await getMyProfilePhotoBlob()
  const nextAvatar = URL.createObjectURL(blob)
  revokeObjectUrl(currentAvatar)
  return nextAvatar
}
