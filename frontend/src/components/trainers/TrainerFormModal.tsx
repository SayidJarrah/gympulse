import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { TrainerRequest, TrainerResponse } from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { createTrainer, updateTrainer } from '../../api/trainers'
import { TrainerPhotoUpload } from './TrainerPhotoUpload'
import { TagInput } from '../ui/TagInput'

interface TrainerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editTarget?: TrainerResponse;
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
    setError(null)
    setEmailError(null)
  }, [editTarget, isOpen])

  if (!isOpen) return null

  const isEditMode = Boolean(editTarget)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setEmailError(null)
    try {
      if (isEditMode && editTarget) {
        await updateTrainer(editTarget.id, form)
      } else {
        await createTrainer(form)
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900">
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

        <div className="px-6 py-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
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

          {isEditMode && editTarget && <TrainerPhotoUpload trainerId={editTarget.id} />}
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
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
          >
            {isLoading ? 'Saving...' : 'Save Trainer'}
          </button>
        </div>
      </div>
    </div>
  )
}
