import { ExclamationTriangleIcon, CalendarIcon } from '@heroicons/react/24/outline'
import type { AffectedInstanceResponse } from '../../types/scheduler'

interface ClassTemplateDeleteConfirmModalProps {
  isOpen: boolean;
  templateName: string;
  affectedInstances: AffectedInstanceResponse[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function ClassTemplateDeleteConfirmModal({
  isOpen,
  templateName,
  affectedInstances,
  onCancel,
  onConfirm,
}: ClassTemplateDeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center gap-2 text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-white">Delete Template?</h2>
        </div>
        <p className="mt-3 text-sm text-gray-400">
          {templateName} has scheduled instances. Deleting it will unlink the template from those classes.
        </p>
        <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
          {affectedInstances.map((instance) => (
            <div key={instance.id} className="text-sm text-gray-400">
              <CalendarIcon className="mr-1 inline h-3.5 w-3.5 text-gray-500" />
              {instance.name} — {new Date(instance.scheduledAt).toLocaleString('en-US', { timeZone: 'UTC' })}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Delete Template
          </button>
        </div>
      </div>
    </div>
  )
}
