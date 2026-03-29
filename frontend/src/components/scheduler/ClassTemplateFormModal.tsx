import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { ClassCategory, ClassTemplateRequest, ClassTemplateResponse, Difficulty } from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { createClassTemplate, updateClassTemplate } from '../../api/classTemplates'
import { RoomPicker } from './RoomPicker'

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
        await updateClassTemplate(editTarget.id, form)
      } else {
        await createClassTemplate(form)
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

        <div className="px-6 py-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
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
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
          >
            {isLoading ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
