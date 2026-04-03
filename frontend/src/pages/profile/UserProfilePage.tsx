import { useEffect } from 'react'
import { ExclamationTriangleIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import { UserProfileForm } from '../../components/profile/UserProfileForm'
import { useProfileStore } from '../../store/profileStore'

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

  useEffect(() => {
    clearMessages()
    void fetchMyProfile()
  }, [clearMessages, fetchMyProfile])

  const showStandaloneError = !isLoading && !profile && error
  const profileInitials = profile
    ? `${profile.firstName?.trim().charAt(0) ?? ''}${profile.lastName?.trim().charAt(0) ?? ''}`.trim() ||
      profile.email.slice(0, 2).toUpperCase()
    : ''

  return (
    <div className="min-h-screen bg-[#0B0F12]">
      <Navbar />

      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-8 shadow-2xl shadow-black/20">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your profile"
                className="h-[72px] w-[72px] rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-green-500/10 text-xl font-semibold text-green-300 ring-1 ring-green-500/20">
                {profileInitials || <UserCircleIcon className="h-8 w-8" aria-hidden="true" />}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">My Profile</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400 sm:text-base">
                Manage the details you want GymFlow to remember about you, from contact
                information to the classes you care about most.
              </p>
              {avatarUrl && (
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-green-300/80">
                  Visible anywhere your GymFlow account is represented.
                </p>
              )}
            </div>
          </div>

          {isLoading && (
            <div className="space-y-4" aria-live="polite">
              <span className="sr-only">Loading profile...</span>
              <div className="h-40 animate-pulse rounded-3xl border border-gray-800 bg-gray-900/70" />
              <div className="h-64 animate-pulse rounded-3xl border border-gray-800 bg-gray-900/70" />
            </div>
          )}

          {showStandaloneError && (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <ExclamationTriangleIcon
                className="mx-auto h-10 w-10 text-red-400"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-semibold text-white">Unable to load profile</h2>
              <p className="mt-2 text-sm text-gray-300">{error}</p>
              <button
                type="button"
                onClick={() => void fetchMyProfile()}
                className="mt-6 inline-flex items-center justify-center rounded-xl border border-green-500 px-5 py-3 text-sm font-semibold text-green-300 transition-colors duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && profile && (
            <div className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-100"
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
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
