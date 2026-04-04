import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ApiErrorResponse } from '../../types/auth'
import type { RoomRequest, RoomResponse } from '../../types/scheduler'
import {
  createRoom,
  deleteRoomPhoto,
  updateRoom,
  uploadRoomPhoto,
} from '../../api/rooms'
import { EntityImageField } from '../media/EntityImageField'
import { getEntityImageErrorMessage, revokeObjectUrl } from '../../utils/entityImage'

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTarget?: RoomResponse;
}

export function RoomFormModal({ isOpen, onClose, onSaved, editTarget }: RoomFormModalProps) {
  const [form, setForm] = useState<RoomRequest>({ name: '', capacity: undefined, description: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageStatus, setImageStatus] = useState<string | null>(null)
  const [imageStatusTone, setImageStatusTone] = useState<'default' | 'info' | 'success'>('default')
  const [imageError, setImageError] = useState<string | null>(null)
  const [savedRoom, setSavedRoom] = useState<RoomResponse | null>(null)
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
        name: editTarget.name,
        capacity: editTarget.capacity ?? undefined,
        description: editTarget.description ?? '',
      })
    } else {
      setForm({ name: '', capacity: undefined, description: '' })
    }

    revokeObjectUrl(previewUrl)
    setPreviewUrl(null)
    setSelectedPhoto(null)
    setImageStatus(null)
    setImageStatusTone('default')
    setImageError(null)
    setSavedRoom(null)
    setRecoveryTargetId(null)
    setRecoveryMessage(null)
    setError(null)
    setNameError(null)
  }, [editTarget, isOpen])

  if (!isOpen) return null

  const isEditMode = Boolean(editTarget)
  const currentRoom = savedRoom ?? editTarget ?? null
  const persistedPhotoUrl = currentRoom?.photoUrl ?? null

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

  const uploadQueuedPhoto = async (roomId: string, recoveryText: string) => {
    if (!selectedPhoto) {
      return true
    }

    setImageStatus('Uploading image...')
    setImageStatusTone('info')

    try {
      await uploadRoomPhoto(roomId, selectedPhoto)
      revokeObjectUrl(previewUrl)
      setSelectedPhoto(null)
      setPreviewUrl(null)
      setImageError(null)
      setImageStatus('Image updated.')
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
      setRecoveryTargetId(roomId)
      setRecoveryMessage(recoveryText)
      return false
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setNameError(null)
    setImageError(null)
    setRecoveryMessage(null)

    try {
      const room = isEditMode && editTarget
        ? await updateRoom(editTarget.id, form)
        : await createRoom(form)

      setSavedRoom(room)

      const uploaded = await uploadQueuedPhoto(
        room.id,
        `${isEditMode ? 'Room details were saved' : 'Room was created'}, but the image was not uploaded yet.`
      )

      if (!uploaded) {
        return
      }

      onSaved()
      onClose()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message = axiosError.response?.data?.error ?? 'Failed to save room.'
      if (code === 'ROOM_NAME_CONFLICT') {
        setNameError('A room with this name already exists')
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
      recoveryMessage ?? 'Room was saved, but the image was not uploaded yet.'
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

    if (!currentRoom?.photoUrl || !window.confirm('Remove this room photo?')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteRoomPhoto(currentRoom.id)
      setSavedRoom({
        ...currentRoom,
        hasPhoto: false,
        photoUrl: null,
      })
      setImageStatus('Image removed.')
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
            {isEditMode ? 'Edit Room' : 'Add Room'}
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
            title="Room photo"
            helperText="Show the space members should expect when they arrive."
            inputId="room-photo"
            variant="room"
            previewUrl={previewUrl ?? persistedPhotoUrl}
            previewAlt={currentRoom?.name ?? 'Room preview'}
            fallback={<BuildingOfficeIcon className="h-10 w-10" aria-hidden="true" />}
            statusMessage={imageStatus}
            statusTone={imageStatusTone}
            errorMessage={imageError}
            actionLabel={persistedPhotoUrl ? 'Replace image' : 'Upload image'}
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

          <div>
            <label htmlFor="room-name" className="mb-1 block text-sm font-semibold text-gray-300">Name</label>
            <input
              id="room-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white ${
                nameError ? 'border-red-500/60' : 'border-gray-700'
              }`}
            />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>
          <div>
            <label htmlFor="room-capacity" className="mb-1 block text-sm font-semibold text-gray-300">Capacity</label>
            <input
              id="room-capacity"
              type="number"
              min={1}
              value={form.capacity ?? ''}
              onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) || undefined })}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
            <p className="mt-1 text-xs text-gray-500">Limits visible in room picker</p>
          </div>
          <div>
            <label htmlFor="room-description" className="mb-1 block text-sm font-semibold text-gray-300">Description</label>
            <textarea
              id="room-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              rows={3}
            />
            <div className="mt-1 text-xs text-gray-500">{form.description?.length ?? 0}/500</div>
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
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
