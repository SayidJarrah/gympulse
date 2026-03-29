import { ExclamationTriangleIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface AffectedInstance {
  id: string;
  name: string;
  scheduledAt: string;
}

interface RoomDeleteConfirmModalProps {
  isOpen: boolean;
  roomName: string;
  affectedInstances: AffectedInstance[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function RoomDeleteConfirmModal({
  isOpen,
  roomName,
  affectedInstances,
  onCancel,
  onConfirm,
}: RoomDeleteConfirmModalProps) {
  if (!isOpen) return null

  const hasConflicts = affectedInstances.length > 0

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
        <h2 className="text-lg font-semibold text-white">Delete Room?</h2>
        {hasConflicts ? (
          <>
            <div className="mt-3 flex items-start gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-3 text-sm text-orange-400">
              <ExclamationTriangleIcon className="h-5 w-5" />
              This room is assigned to the following scheduled classes:
            </div>
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
              {affectedInstances.map((instance) => (
                <div key={instance.id} className="text-sm text-gray-400">
                  <CalendarIcon className="mr-1 inline h-3.5 w-3.5 text-gray-500" />
                  {instance.name} — {new Date(instance.scheduledAt).toLocaleString('en-US', { timeZone: 'UTC' })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">If you proceed, the room will be cleared from these instances.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-400">
            Are you sure you want to delete {roomName}? This cannot be undone.
          </p>
        )}
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
            {hasConflicts ? 'Delete Anyway' : 'Delete Room'}
          </button>
        </div>
      </div>
    </div>
  )
}
