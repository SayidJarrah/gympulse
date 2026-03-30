import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ProfileChipInput } from './ProfileChipInput'
import type { UpdateUserProfileRequest, UserProfile } from '../../types/userProfile'
import type { ProfileFieldName } from '../../store/profileStore'

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
  onSubmit: (request: UpdateUserProfileRequest) => Promise<void>;
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

export function UserProfileForm({
  profile,
  onSubmit,
  isSaving,
  fieldErrors,
}: UserProfileFormProps) {
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

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit({
      firstName: normalizeOptionalText(values.firstName),
      lastName: normalizeOptionalText(values.lastName),
      phone: normalizeOptionalText(values.phone),
      dateOfBirth: normalizeOptionalText(values.dateOfBirth),
      fitnessGoals: values.fitnessGoals,
      preferredClassTypes: values.preferredClassTypes,
    })
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8" noValidate>
      <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Account profile</h2>
          <p className="mt-1 text-sm text-gray-400">
            Keep your contact details and training preferences up to date.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="profile-email" className="text-sm font-semibold text-gray-200">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              value={profile.email}
              readOnly
              disabled
              className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3 text-sm text-gray-400"
            />
          </div>

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

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-phone" className="text-sm font-semibold text-gray-200">
              Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
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
              Use international format. Spaces, dashes, and parentheses are allowed.
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
              aria-describedby={errors.dateOfBirth ? 'profile-date-of-birth-error' : undefined}
              {...register('dateOfBirth')}
            />
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
      </section>

      <section className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Training preferences</h2>
          <p className="mt-1 text-sm text-gray-400">
            These notes help shape future recommendations and booking defaults.
          </p>
        </div>

        <div className="grid gap-6">
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
                helperText="Add up to 5 goals in the order that matters most to you."
                error={errors.fitnessGoals?.message}
              />
            )}
          />

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
                helperText="List up to 5 class styles you want to see more often."
                error={errors.preferredClassTypes?.message}
              />
            )}
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-3xl border border-gray-800 bg-gray-900/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Changes apply to your full profile.</p>
          <p className="mt-1 text-sm text-gray-400">
            Empty fields are saved as blank values, and list order is preserved.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? 'Saving profile...' : 'Save profile'}
        </button>
      </div>
    </form>
  )
}
