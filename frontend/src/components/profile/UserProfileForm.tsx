import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { AxiosError } from 'axios'
import { UserCircleIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'
import { EntityImageField } from '../media/EntityImageField'
import { ProfileChipInput } from './ProfileChipInput'
import type { ApiErrorResponse } from '../../types/auth'
import type { UpdateUserProfileRequest, UserProfile } from '../../types/userProfile'
import type { ProfileFieldName } from '../../store/profileStore'
import { getEntityImageErrorMessage, revokeObjectUrl } from '../../utils/entityImage'

const nameSchema = z
  .string()
  .refine((value) => value.trim().length <= 50, 'Must be 50 characters or fewer.')

const phoneSchema = z.string().refine((value) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }

  const normalized = trimmed.replace(/[\s\-()]/g, '')
  return /^\+[1-9]\d{7,19}$/.test(normalized)
}, 'Enter a valid international phone number.')

const dateSchema = z.string().refine((value) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false
  }

  const parsedDate = new Date(`${trimmed}T00:00:00Z`)
  if (Number.isNaN(parsedDate.getTime())) {
    return false
  }

  if (parsedDate.toISOString().slice(0, 10) !== trimmed) {
    return false
  }

  return trimmed <= new Date().toISOString().slice(0, 10)
}, 'Enter a valid date of birth that is not in the future.')

const chipListSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(5, 'You can add up to 5 items.')

const userProfileFormSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  dateOfBirth: dateSchema,
  fitnessGoals: chipListSchema,
  preferredClassTypes: chipListSchema,
})

type UserProfileFormValues = z.infer<typeof userProfileFormSchema>

interface UserProfileFormProps {
  profile: UserProfile;
  avatarUrl: string | null;
  onSubmit: (request: UpdateUserProfileRequest) => Promise<void>;
  onUploadPhoto: (file: File) => Promise<void>;
  onDeletePhoto: () => Promise<void>;
  onSetSuccessMessage: (message: string | null) => void;
  onFocusFirstError: (fieldName: string) => void;
  isSaving: boolean;
  fieldErrors: Partial<Record<ProfileFieldName, string>>;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function defaultValuesFromProfile(profile: UserProfile): UserProfileFormValues {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    dateOfBirth: profile.dateOfBirth ?? '',
    fitnessGoals: profile.fitnessGoals,
    preferredClassTypes: profile.preferredClassTypes,
  }
}

function getProfileInitials(profile: UserProfile): string {
  const first = profile.firstName?.trim().charAt(0) ?? ''
  const last = profile.lastName?.trim().charAt(0) ?? ''
  const initials = `${first}${last}`.trim()
  return initials || profile.email.slice(0, 2).toUpperCase()
}

export function UserProfileForm({
  profile,
  avatarUrl,
  onSubmit,
  onUploadPhoto,
  onDeletePhoto,
  onSetSuccessMessage,
  onFocusFirstError,
  isSaving,
  fieldErrors,
}: UserProfileFormProps) {
  const [queuedPhoto, setQueuedPhoto] = useState<File | null>(null)
  const [queuedPreviewUrl, setQueuedPreviewUrl] = useState<string | null>(null)
  const [photoStatus, setPhotoStatus] = useState<string | null>(null)
  const [photoStatusTone, setPhotoStatusTone] = useState<'default' | 'info' | 'success'>('default')
  const [photoError, setPhotoError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileFormSchema),
    defaultValues: defaultValuesFromProfile(profile),
  })

  useEffect(() => {
    reset(defaultValuesFromProfile(profile))
  }, [profile, reset])

  useEffect(() => {
    return () => {
      revokeObjectUrl(queuedPreviewUrl)
    }
  }, [queuedPreviewUrl])

  useEffect(() => {
    if (fieldErrors.firstName) {
      setError('firstName', { message: fieldErrors.firstName })
    }
    if (fieldErrors.lastName) {
      setError('lastName', { message: fieldErrors.lastName })
    }
    if (fieldErrors.phone) {
      setError('phone', { message: fieldErrors.phone })
    }
    if (fieldErrors.dateOfBirth) {
      setError('dateOfBirth', { message: fieldErrors.dateOfBirth })
    }
    if (fieldErrors.fitnessGoals) {
      setError('fitnessGoals', { message: fieldErrors.fitnessGoals })
    }
    if (fieldErrors.preferredClassTypes) {
      setError('preferredClassTypes', { message: fieldErrors.preferredClassTypes })
    }
  }, [fieldErrors, setError])

  const handlePhotoSelect = (file: File | null) => {
    setPhotoError(null)

    if (!file) {
      revokeObjectUrl(queuedPreviewUrl)
      setQueuedPhoto(null)
      setQueuedPreviewUrl(null)
      setPhotoStatus(null)
      setPhotoStatusTone('default')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    revokeObjectUrl(queuedPreviewUrl)
    setQueuedPhoto(file)
    setQueuedPreviewUrl(nextPreviewUrl)
    setPhotoStatus('Ready to upload after save.')
    setPhotoStatusTone('info')
  }

  const handlePhotoRemove = async () => {
    setPhotoError(null)

    if (queuedPhoto) {
      handlePhotoSelect(null)
      return
    }

    if (!avatarUrl || !window.confirm('Remove your current profile photo?')) {
      return
    }

    try {
      await onDeletePhoto()
      setPhotoStatus('Photo removed.')
      setPhotoStatusTone('success')
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      setPhotoError(getEntityImageErrorMessage(code, 'Failed to remove image.'))
    }
  }

  const handleFormSubmit = handleSubmit(
    async (values) => {
      setPhotoError(null)
      setPhotoStatus(null)
      setPhotoStatusTone('default')

      await onSubmit({
        firstName: normalizeOptionalText(values.firstName),
        lastName: normalizeOptionalText(values.lastName),
        phone: normalizeOptionalText(values.phone),
        dateOfBirth: normalizeOptionalText(values.dateOfBirth),
        fitnessGoals: values.fitnessGoals,
        preferredClassTypes: values.preferredClassTypes,
      })

      if (!queuedPhoto) {
        return
      }

      try {
        await onUploadPhoto(queuedPhoto)
        revokeObjectUrl(queuedPreviewUrl)
        setQueuedPhoto(null)
        setQueuedPreviewUrl(null)
        setPhotoStatus('Photo updated.')
        setPhotoStatusTone('success')
        onSetSuccessMessage('Profile updated. Photo updated.')
      } catch (err) {
        const axiosError = err as AxiosError<ApiErrorResponse>
        const code = axiosError.response?.data?.code ?? ''
        setPhotoError(getEntityImageErrorMessage(code, 'Upload failed. Try again.'))
        setPhotoStatus('Ready to upload after save.')
        setPhotoStatusTone('info')
        onSetSuccessMessage('Profile updated.')
      }
    },
    (formErrors) => {
      // On failed submit: focus the first invalid field
      const fieldOrder: (keyof typeof formErrors)[] = [
        'firstName',
        'lastName',
        'phone',
        'dateOfBirth',
        'fitnessGoals',
        'preferredClassTypes',
      ]
      const firstErrorField = fieldOrder.find((f) => formErrors[f])
      if (firstErrorField) {
        onFocusFirstError(firstErrorField)
      }
    }
  )

  const visibleAvatarUrl = queuedPreviewUrl ?? avatarUrl
  const showRemove = Boolean(queuedPhoto || avatarUrl)
  const profileInitials = getProfileInitials(profile)

  return (
    <form id="user-profile-form" onSubmit={handleFormSubmit} className="flex flex-col gap-6" aria-label="User profile form" noValidate>
      <EntityImageField
        title="Profile photo"
        helperText="Use a clear headshot so your account is easier to recognize across GymFlow."
        inputId="profile-photo"
        variant="avatar"
        previewUrl={visibleAvatarUrl}
        previewAlt={`${profile.firstName ?? 'GymFlow'} ${profile.lastName ?? 'member'} profile`}
        fallback={
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
            {visibleAvatarUrl ? null : profileInitials || <UserCircleIcon className="h-8 w-8" aria-hidden="true" />}
          </div>
        }
        statusMessage={photoStatus}
        statusTone={photoStatusTone}
        errorMessage={photoError}
        actionLabel={avatarUrl ? 'Replace photo' : 'Upload photo'}
        removeLabel="Remove"
        showRemove={showRemove}
        disabled={isSaving}
        onFileSelect={handlePhotoSelect}
        onRemove={() => {
          void handlePhotoRemove()
        }}
      />

      {/* Read-only email field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-email" className="text-sm font-medium text-gray-300">
          Email address
        </label>
        <input
          id="profile-email"
          type="email"
          value={profile.email}
          readOnly
          aria-readonly="true"
          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300"
        />
        <p className="text-sm text-gray-400">
          Email changes are handled in account management, not on this page.
        </p>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="profile-first-name" className="text-sm font-semibold text-gray-200">
            First name
          </label>
          <input
            id="profile-first-name"
            type="text"
            placeholder="e.g. Alice"
            disabled={isSaving}
            className={`w-full rounded-xl border bg-gray-950/70 px-4 py-3 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
              errors.firstName
                ? 'border-red-500/60 focus:ring-red-500'
                : 'border-gray-700 focus:ring-green-500'
            }`}
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? 'profile-first-name-error' : undefined}
            {...register('firstName')}
          />
          {errors.firstName && (
            <p id="profile-first-name-error" className="text-xs text-red-400" role="alert">
              {errors.firstName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="profile-last-name" className="text-sm font-semibold text-gray-200">
            Last name
          </label>
          <input
            id="profile-last-name"
            type="text"
            placeholder="e.g. Brown"
            disabled={isSaving}
            className={`w-full rounded-xl border bg-gray-950/70 px-4 py-3 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
              errors.lastName
                ? 'border-red-500/60 focus:ring-red-500'
                : 'border-gray-700 focus:ring-green-500'
            }`}
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? 'profile-last-name-error' : undefined}
            {...register('lastName')}
          />
          {errors.lastName && (
            <p id="profile-last-name-error" className="text-xs text-red-400" role="alert">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-400">
        Names are optional, but when provided they must be 1 to 50 characters.
      </p>

      {/* Contact row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="profile-phone" className="text-sm font-semibold text-gray-200">
            Phone number
          </label>
          <input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+48 123 123 123"
            disabled={isSaving}
            className={`w-full rounded-xl border bg-gray-950/70 px-4 py-3 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
              errors.phone
                ? 'border-red-500/60 focus:ring-red-500'
                : 'border-gray-700 focus:ring-green-500'
            }`}
            aria-invalid={!!errors.phone}
            aria-describedby="profile-phone-helper profile-phone-error"
            {...register('phone')}
          />
          <p id="profile-phone-helper" className="text-xs text-gray-400">
            Use international format starting with +.
          </p>
          {errors.phone && (
            <p id="profile-phone-error" className="text-xs text-red-400" role="alert">
              {errors.phone.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="profile-date-of-birth" className="text-sm font-semibold text-gray-200">
            Date of birth
          </label>
          <input
            id="profile-date-of-birth"
            type="date"
            disabled={isSaving}
            max={new Date().toISOString().slice(0, 10)}
            className={`w-full rounded-xl border bg-gray-950/70 px-4 py-3 text-sm text-white transition-colors duration-200 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70 ${
              errors.dateOfBirth
                ? 'border-red-500/60 focus:ring-red-500'
                : 'border-gray-700 focus:ring-green-500'
            }`}
            aria-invalid={!!errors.dateOfBirth}
            aria-describedby={errors.dateOfBirth ? 'profile-date-of-birth-helper profile-date-of-birth-error' : 'profile-date-of-birth-helper'}
            {...register('dateOfBirth')}
          />
          <p id="profile-date-of-birth-helper" className="text-xs text-gray-400">
            Date cannot be in the future.
          </p>
          {errors.dateOfBirth && (
            <p
              id="profile-date-of-birth-error"
              className="text-xs text-red-400"
              role="alert"
            >
              {errors.dateOfBirth.message}
            </p>
          )}
        </div>
      </div>

      {/* Fitness goals */}
      <Controller
        name="fitnessGoals"
        control={control}
        render={({ field }) => (
          <ProfileChipInput
            id="profile-fitness-goals"
            label="Fitness goals"
            value={field.value}
            onChange={field.onChange}
            placeholder="Add a goal and press Enter"
            disabled={isSaving}
            helperText="Up to 5 goals. Press Enter or comma to add each one."
            error={errors.fitnessGoals?.message}
          />
        )}
      />

      {/* Preferred class types */}
      <Controller
        name="preferredClassTypes"
        control={control}
        render={({ field }) => (
          <ProfileChipInput
            id="profile-preferred-class-types"
            label="Preferred class types"
            value={field.value}
            onChange={field.onChange}
            placeholder="Add a class type and press Enter"
            disabled={isSaving}
            helperText="Up to 5 preferences. Press Enter or comma to add each one."
            error={errors.preferredClassTypes?.message}
          />
        )}
      />
    </form>
  )
}
