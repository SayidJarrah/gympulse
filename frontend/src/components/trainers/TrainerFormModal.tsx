import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ApiErrorResponse } from '../../types/auth'
import type { TrainerRequest, TrainerResponse } from '../../types/scheduler'
import {
  createTrainer,
  deleteTrainerPhoto,
  updateTrainer,
  uploadTrainerPhoto,
} from '../../api/trainers'
import { EntityImageField } from '../media/EntityImageField'
import { TagInput } from '../ui/TagInput'
import { getEntityImageErrorMessage, revokeObjectUrl } from '../../utils/entityImage'

interface TrainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTarget?: TrainerResponse;
}

function getTrainerInitials(trainer: Pick<TrainerResponse, 'firstName' | 'lastName' | 'email'>): string {
  return `${trainer.firstName.charAt(0)}${trainer.lastName.charAt(0)}`.trim() || trainer.email.slice(0, 2).toUpperCase()
}

export function TrainerFormModal({ isOpen, onClose, onSaved, editTarget }: TrainerFormModalProps) {
  const [form, setForm] = useState<TrainerRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    specialisations: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageStatus, setImageStatus] = useState<string | null>(null)
  const [imageStatusTone, setImageStatusTone] = useState<'default' | 'info' | 'success'>('default')
  const [imageError, setImageError] = useState<string | null>(null)
  const [savedTrainer, setSavedTrainer] = useState<TrainerResponse | null>(null)
  const [recoveryTargetId, setRecoveryTargetId] = useState<string | null>(null)
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      revokeObjectUrl(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (editTarget) {
      setForm({
        firstName: editTarget.firstName,
        lastName: editTarget.lastName,
        email: editTarget.email,
        phone: editTarget.phone ?? '',
        bio: editTarget.bio ?? '',
        specialisations: editTarget.specialisations ?? [],
      })
    } else {
      setForm({ firstName: '', lastName: '', email: '', phone: '', bio: '', specialisations: [] })
    }

    revokeObjectUrl(previewUrl)
    setPreviewUrl(null)
    setSelectedPhoto(null)
    setImageStatus(null)
    setImageStatusTone('default')
    setImageError(null)
    setSavedTrainer(null)
    setRecoveryTargetId(null)
    setRecoveryMessage(null)
    setError(null)
    setEmailError(null)
  }, [editTarget, isOpen])

  if (!isOpen) return null

  const isEditMode = Boolean(editTarget)
  const currentTrainer = savedTrainer ?? editTarget ?? null
  const persistedPhotoUrl = currentTrainer?.photoUrl ?? null

  const handlePhotoSelect = (file: File | null) => {
    setImageError(null)
    setRecoveryMessage(null)

    if (!file) {
      revokeObjectUrl(previewUrl)
      setSelectedPhoto(null)
      setPreviewUrl(null)
      setImageStatus(null)
      setImageStatusTone('default')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    revokeObjectUrl(previewUrl)
    setSelectedPhoto(file)
    setPreviewUrl(nextPreviewUrl)
    setImageStatus('Ready to upload after save.')
    setImageStatusTone('info')
  }

  const uploadQueuedPhoto = async (trainerId: string, recoveryText: string) => {
    if (!selectedPhoto) {
      return true
    }

    setImageStatus('Uploading image...')
    setImageStatusTone('info')

    try {
      await uploadTrainerPhoto(trainerId, selectedPhoto)
      revokeObjectUrl(previewUrl)
      setSelectedPhoto(null)
      setPreviewUrl(null)
      setImageError(null)
      setImageStatus('Photo updated.')
      setImageStatusTone('success')
      setRecoveryTargetId(null)
      setRecoveryMessage(null)
      return true
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      setImageError(getEntityImageErrorMessage(code, 'Upload failed. Try again.'))
      setImageStatus('Ready to upload after save.')
      setImageStatusTone('info')
      setRecoveryTargetId(trainerId)
      setRecoveryMessage(recoveryText)
      return false
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setEmailError(null)
    setImageError(null)
    setRecoveryMessage(null)

    try {
      const trainer = isEditMode && editTarget
        ? await updateTrainer(editTarget.id, form)
        : await createTrainer(form)

      setSavedTrainer(trainer)

      const uploaded = await uploadQueuedPhoto(
        trainer.id,
        `${isEditMode ? 'Trainer details were saved' : 'Trainer was created'}, but the photo was not uploaded yet.`
      )

      if (!uploaded) {
        return
      }

      onSaved()
      onClose()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message = axiosError.response?.data?.error ?? 'Failed to save trainer.'
      if (code === 'TRAINER_EMAIL_CONFLICT') {
        setEmailError('A trainer with this email already exists')
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetryUpload = async () => {
    if (!recoveryTargetId) {
      return
    }

    setIsLoading(true)
    const uploaded = await uploadQueuedPhoto(
      recoveryTargetId,
      recoveryMessage ?? 'Trainer was saved, but the photo was not uploaded yet.'
    )

    if (uploaded) {
      onSaved()
      onClose()
    }
    setIsLoading(false)
  }

  const handleRemoveImage = async () => {
    setImageError(null)
    setRecoveryMessage(null)

    if (selectedPhoto) {
      handlePhotoSelect(null)
      return
    }

    if (!currentTrainer?.photoUrl || !window.confirm('Remove this trainer photo?')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteTrainerPhoto(currentTrainer.id)
      setSavedTrainer({
        ...currentTrainer,
        hasPhoto: false,
        photoUrl: null,
      })
      setImageStatus('Photo removed.')
      setImageStatusTone('success')
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      setImageError(getEntityImageErrorMessage(code, 'Failed to remove image.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveWithoutImage = () => {
    revokeObjectUrl(previewUrl)
    setPreviewUrl(null)
    setSelectedPhoto(null)
    setRecoveryMessage(null)
    setRecoveryTargetId(null)
    setImageStatus(null)
    setImageError(null)
    onSaved()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) onClose()
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <h2 className="text-xl font-semibold text-white">
            {isEditMode ? 'Edit Trainer' : 'Add Trainer'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <EntityImageField
            title="Profile Photo"
            helperText="Use a recognizable headshot so members can spot this trainer quickly."
            inputId="trainer-photo"
            variant="avatar"
            previewUrl={previewUrl ?? persistedPhotoUrl}
            previewAlt={currentTrainer ? `${currentTrainer.firstName} ${currentTrainer.lastName}` : 'Trainer preview'}
            fallback={
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                {currentTrainer ? getTrainerInitials(currentTrainer) : <UserCircleIcon className="h-9 w-9" aria-hidden="true" />}
              </div>
            }
            statusMessage={imageStatus}
            statusTone={imageStatusTone}
            errorMessage={imageError}
            actionLabel={persistedPhotoUrl ? 'Replace photo' : 'Upload photo'}
            removeLabel="Remove"
            showRemove={Boolean(selectedPhoto || persistedPhotoUrl)}
            disabled={isLoading}
            onFileSelect={handlePhotoSelect}
            onRemove={() => {
              void handleRemoveImage()
            }}
          />

          {recoveryMessage && recoveryTargetId && selectedPhoto && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
              <p>{recoveryMessage}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleRetryUpload()}
                  disabled={isLoading}
                  className="rounded-md border border-red-300/40 px-3 py-2 text-sm font-medium text-white hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Retry upload
                </button>
                <button
                  type="button"
                  onClick={handleSaveWithoutImage}
                  disabled={isLoading}
                  className="rounded-md px-3 py-2 text-sm text-red-100/90 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Save without image
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="trainer-first-name" className="mb-1 block text-sm font-semibold text-gray-300">First Name</label>
              <input
                id="trainer-first-name"
                type="text"
                value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="trainer-last-name" className="mb-1 block text-sm font-semibold text-gray-300">Last Name</label>
              <input
                id="trainer-last-name"
                type="text"
                value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="trainer-email" className="mb-1 block text-sm font-semibold text-gray-300">Email</label>
            <input
              id="trainer-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white ${
                emailError ? 'border-red-500/60' : 'border-gray-700'
              }`}
            />
            {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="trainer-phone" className="mb-1 block text-sm font-semibold text-gray-300">Phone</label>
            <input
              id="trainer-phone"
              type="text"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="trainer-bio" className="mb-1 block text-sm font-semibold text-gray-300">Bio</label>
            <textarea
              id="trainer-bio"
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              rows={3}
            />
            <div className="mt-1 text-xs text-gray-500">{form.bio?.length ?? 0}/1000</div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-300">Specialisations</label>
            <TagInput
              value={form.specialisations ?? []}
              onChange={(tags) => setForm((prev) => ({ ...prev, specialisations: tags }))}
              max={10}
              maxLength={50}
              placeholder="Add tag"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading}
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Trainer'}
          </button>
        </div>
      </div>
    </div>
  )
}
