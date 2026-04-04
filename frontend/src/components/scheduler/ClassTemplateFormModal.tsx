import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ApiErrorResponse } from '../../types/auth'
import type {
  ClassCategory,
  ClassTemplateRequest,
  ClassTemplateResponse,
  Difficulty,
} from '../../types/scheduler'
import {
  createClassTemplate,
  deleteClassTemplatePhoto,
  updateClassTemplate,
  uploadClassTemplatePhoto,
} from '../../api/classTemplates'
import { EntityImageField } from '../media/EntityImageField'
import { RoomPicker } from './RoomPicker'
import { getEntityImageErrorMessage, revokeObjectUrl } from '../../utils/entityImage'

interface ClassTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTarget?: ClassTemplateResponse;
}

const CATEGORIES: ClassCategory[] = [
  'Cardio',
  'Strength',
  'Flexibility',
  'Mind & Body',
  'Cycling',
  'Combat',
  'Dance',
  'Functional',
  'Aqua',
  'Wellness',
  'Other',
]

const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'All Levels']

export function ClassTemplateFormModal({
  isOpen,
  onClose,
  onSaved,
  editTarget,
}: ClassTemplateFormModalProps) {
  const [form, setForm] = useState<ClassTemplateRequest>({
    name: '',
    description: '',
    category: 'Cardio',
    defaultDurationMin: 60,
    defaultCapacity: 20,
    difficulty: 'All Levels',
    roomId: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageStatus, setImageStatus] = useState<string | null>(null)
  const [imageStatusTone, setImageStatusTone] = useState<'default' | 'info' | 'success'>('default')
  const [imageError, setImageError] = useState<string | null>(null)
  const [savedTemplate, setSavedTemplate] = useState<ClassTemplateResponse | null>(null)
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
        description: editTarget.description ?? '',
        category: editTarget.category,
        defaultDurationMin: editTarget.defaultDurationMin,
        defaultCapacity: editTarget.defaultCapacity,
        difficulty: editTarget.difficulty,
        roomId: editTarget.room?.id ?? null,
      })
    } else {
      setForm({
        name: '',
        description: '',
        category: 'Cardio',
        defaultDurationMin: 60,
        defaultCapacity: 20,
        difficulty: 'All Levels',
        roomId: null,
      })
    }

    revokeObjectUrl(previewUrl)
    setPreviewUrl(null)
    setSelectedPhoto(null)
    setImageStatus(null)
    setImageStatusTone('default')
    setImageError(null)
    setSavedTemplate(null)
    setRecoveryTargetId(null)
    setRecoveryMessage(null)
    setError(null)
    setNameError(null)
  }, [editTarget, isOpen])

  if (!isOpen) return null

  const isEditMode = Boolean(editTarget)
  const currentTemplate = savedTemplate ?? editTarget ?? null
  const persistedPhotoUrl = currentTemplate?.photoUrl ?? null

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

  const uploadQueuedPhoto = async (templateId: string, recoveryText: string) => {
    if (!selectedPhoto) {
      return true
    }

    setImageStatus('Uploading image...')
    setImageStatusTone('info')

    try {
      await uploadClassTemplatePhoto(templateId, selectedPhoto)
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
      setRecoveryTargetId(templateId)
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
      const template = isEditMode && editTarget
        ? await updateClassTemplate(editTarget.id, form)
        : await createClassTemplate(form)

      setSavedTemplate(template)

      const uploaded = await uploadQueuedPhoto(
        template.id,
        `${isEditMode ? 'Class template details were saved' : 'Class template was created'}, but the image was not uploaded yet.`
      )

      if (!uploaded) {
        return
      }

      onSaved()
      onClose()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message = axiosError.response?.data?.error ?? 'Failed to save template.'
      if (code === 'CLASS_TEMPLATE_NAME_CONFLICT') {
        setNameError('A template with this name already exists')
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
      recoveryMessage ?? 'Class template was saved, but the image was not uploaded yet.'
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

    if (!currentTemplate?.photoUrl || !window.confirm('Remove this class image?')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteClassTemplatePhoto(currentTemplate.id)
      setSavedTemplate({
        ...currentTemplate,
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
            {isEditMode ? 'Edit Template' : 'Add Template'}
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
            title="Class image"
            helperText="Use a representative image for the class members will browse in schedules and details."
            inputId="class-template-photo"
            variant="cover"
            previewUrl={previewUrl ?? persistedPhotoUrl}
            previewAlt={currentTemplate?.name ?? 'Class template preview'}
            fallback={<PhotoIcon className="h-10 w-10" aria-hidden="true" />}
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
            <label htmlFor="template-name" className="mb-1 block text-sm font-semibold text-gray-300">Name</label>
            <input
              id="template-name"
              type="text"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white ${
                nameError ? 'border-red-500/60' : 'border-gray-700'
              }`}
            />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="template-category" className="mb-1 block text-sm font-semibold text-gray-300">Category</label>
              <select
                id="template-category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as ClassCategory })}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="template-difficulty" className="mb-1 block text-sm font-semibold text-gray-300">Difficulty</label>
              <select
                id="template-difficulty"
                value={form.difficulty}
                onChange={(event) => setForm({ ...form, difficulty: event.target.value as Difficulty })}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              >
                {DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="template-duration" className="mb-1 block text-sm font-semibold text-gray-300">Duration (min)</label>
              <input
                id="template-duration"
                type="number"
                min={15}
                max={240}
                value={form.defaultDurationMin}
                onChange={(event) => setForm({ ...form, defaultDurationMin: Number(event.target.value) })}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="template-capacity" className="mb-1 block text-sm font-semibold text-gray-300">Capacity</label>
              <input
                id="template-capacity"
                type="number"
                min={1}
                max={500}
                value={form.defaultCapacity}
                onChange={(event) => setForm({ ...form, defaultCapacity: Number(event.target.value) })}
                className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <RoomPicker
            value={form.roomId ?? null}
            onChange={(value) => setForm({ ...form, roomId: value })}
          />

          <div>
            <label htmlFor="template-description" className="mb-1 block text-sm font-semibold text-gray-300">Description</label>
            <textarea
              id="template-description"
              value={form.description ?? ''}
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
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
