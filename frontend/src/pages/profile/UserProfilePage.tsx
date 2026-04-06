import { useCallback, useEffect, useRef } from 'react'
import { ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import { UserProfileForm } from '../../components/profile/UserProfileForm'
import { ProfileSummaryCard } from '../../components/profile/ProfileSummaryCard'
import { useProfileStore } from '../../store/profileStore'
import { PROFILE_ERROR_MESSAGES } from '../../utils/profileErrors'

const ACCESS_DENIED_MESSAGE = PROFILE_ERROR_MESSAGES['ACCESS_DENIED']

export function UserProfilePage() {
  const {
    profile,
    avatarUrl,
    isLoading,
    isSaving,
    error,
    fieldErrors,
    successMessage,
    fetchMyProfile,
    saveMyProfile,
    uploadPhoto,
    deletePhoto,
    setSuccessMessage,
    clearMessages,
  } = useProfileStore()

  const successBannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    clearMessages()
    void fetchMyProfile()
  }, [clearMessages, fetchMyProfile])

  // Focus success banner when it appears
  useEffect(() => {
    if (successMessage && successBannerRef.current) {
      successBannerRef.current.focus()
    }
  }, [successMessage])

  const handleFocusFirstError = useCallback((fieldName: string) => {
    const fieldIdMap: Record<string, string> = {
      firstName: 'profile-first-name',
      lastName: 'profile-last-name',
      phone: 'profile-phone',
      dateOfBirth: 'profile-date-of-birth',
      fitnessGoals: 'profile-fitness-goals',
      preferredClassTypes: 'profile-preferred-class-types',
    }
    const elementId = fieldIdMap[fieldName]
    if (elementId) {
      const el = document.getElementById(elementId)
      el?.focus()
    }
  }, [])

  const isAccessDenied = !isLoading && !profile && error === ACCESS_DENIED_MESSAGE
  const showFetchError = !isLoading && !profile && error && !isAccessDenied

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold leading-tight text-white">Your Profile</h1>
          <p className="max-w-2xl text-base font-normal leading-normal text-gray-400">
            Manage the personal details tied to your GymFlow account.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-800" />
                <div className="flex-1">
                  <div className="h-5 w-32 rounded bg-gray-800" />
                  <div className="mt-2 h-4 w-40 rounded bg-gray-800" />
                </div>
              </div>
              <div className="mt-6 h-24 rounded-lg bg-gray-800" />
              <div className="mt-6 h-4 w-full rounded bg-gray-800" />
              <div className="mt-3 h-3 w-28 rounded bg-gray-800" />
            </div>
            <div className="mt-6 animate-pulse rounded-xl border border-gray-800 bg-gray-900 p-6 lg:mt-0">
              <div className="h-6 w-40 rounded bg-gray-800" />
              <div className="mt-2 h-4 w-64 rounded bg-gray-800" />
              <div className="mt-6 space-y-4">
                <div className="h-10 rounded bg-gray-800" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 rounded bg-gray-800" />
                  <div className="h-10 rounded bg-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 rounded bg-gray-800" />
                  <div className="h-10 rounded bg-gray-800" />
                </div>
                <div className="h-16 rounded bg-gray-800" />
                <div className="h-16 rounded bg-gray-800" />
              </div>
              <div className="mt-6 h-10 w-full rounded bg-gray-800" />
            </div>
          </div>
        )}

        {/* Access denied state */}
        {isAccessDenied && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-6 py-10 text-center shadow-md shadow-black/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
              <LockClosedIcon className="h-7 w-7 text-orange-400" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-white">Access denied</h2>
            <p className="text-sm text-gray-400">
              You do not have permission to view this profile.
            </p>
            <a
              href="/classes"
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Back to classes
            </a>
          </div>
        )}

        {/* Fetch error state */}
        {showFetchError && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-6 py-10 text-center shadow-md shadow-black/50">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <ExclamationTriangleIcon className="h-7 w-7 text-red-400" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-white">Failed to load your profile</h2>
            <p className="text-sm text-gray-400">
              Please try again. If the problem continues, contact support.
            </p>
            <button
              type="button"
              onClick={() => void fetchMyProfile()}
              className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              Try again
            </button>
          </div>
        )}

        {/* Main content — two-column grid */}
        {!isLoading && profile && (
          <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6 flex flex-col gap-6">
            {/* Left: summary card */}
            <ProfileSummaryCard profile={profile} />

            {/* Right: form card */}
            <section className="rounded-xl border border-gray-800 bg-gray-900 shadow-md shadow-black/50">
              <div className="border-b border-gray-800 px-6 py-5">
                <h2 className="text-xl font-semibold leading-tight text-white">Personal details</h2>
                <p className="mt-1 text-sm text-gray-400">
                  Update your contact details, birth date, and fitness preferences.
                </p>
              </div>

              <div className="px-6 py-6">
                <div className="flex flex-col gap-6">
                  {/* Banners inside the form card content area */}
                  {error && (
                    <div
                      role="alert"
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                    >
                      {error}
                    </div>
                  )}

                  {successMessage && (
                    <div
                      ref={successBannerRef}
                      role="status"
                      aria-live="polite"
                      tabIndex={-1}
                      className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 focus:outline-none"
                    >
                      {successMessage}
                    </div>
                  )}

                  <UserProfileForm
                    profile={profile}
                    avatarUrl={avatarUrl}
                    isSaving={isSaving}
                    fieldErrors={fieldErrors}
                    onSubmit={saveMyProfile}
                    onUploadPhoto={uploadPhoto}
                    onDeletePhoto={deletePhoto}
                    onSetSuccessMessage={setSuccessMessage}
                    onFocusFirstError={handleFocusFirstError}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-gray-800 px-6 py-4">
                <button
                  type="submit"
                  form="user-profile-form"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-500/40"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
