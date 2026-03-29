import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { RoomRequest, RoomResponse } from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { createRoom, updateRoom } from '../../api/rooms'

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
    setError(null)
    setNameError(null)
  }, [editTarget, isOpen])

  if (!isOpen) return null

  const isEditMode = Boolean(editTarget)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setNameError(null)
    try {
      if (isEditMode && editTarget) {
        await updateRoom(editTarget.id, form)
      } else {
        await createRoom(form)
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

        <div className="px-6 py-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
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
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
