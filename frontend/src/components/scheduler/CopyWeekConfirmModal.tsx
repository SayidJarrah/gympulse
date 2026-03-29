import { useEffect, useState } from 'react'
import { CheckCircleIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import type { CopyWeekResponse } from '../../types/scheduler'
import { formatWeekLabel } from '../../utils/week'

interface CopyWeekConfirmModalProps {
  isOpen: boolean;
  sourceWeek: string;
  count: number;
  onConfirm: () => Promise<CopyWeekResponse>;
  onClose: () => void;
}

export function CopyWeekConfirmModal({
  isOpen,
  sourceWeek,
  count,
  onConfirm,
  onClose,
}: CopyWeekConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<CopyWeekResponse | null>(null)

  useEffect(() => {
    if (isOpen) {
      setResult(null)
      setIsLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const response = await onConfirm()
      setResult(response)
      setTimeout(onClose, 1500)
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
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
        {result ? (
          <>
            <CheckCircleIcon className="mx-auto h-10 w-10 text-green-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">Copy complete</h2>
            <p className="mt-2 text-sm text-gray-400">
              {result.copied} classes copied. {result.skipped} skipped.
            </p>
          </>
        ) : (
          <>
            <DocumentDuplicateIcon className="mx-auto h-10 w-10 text-green-400" />
            <h2 className="mt-4 text-lg font-semibold text-white">Copy Week to Next Week</h2>
            <p className="mt-2 text-sm text-gray-400">
              This will copy all {count} class instances from {formatWeekLabel(sourceWeek)}.
            </p>
            <p className="mt-2 text-xs text-gray-500">Trainer conflicts will not be checked during copy.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
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
                onClick={handleConfirm}
                disabled={isLoading}
                className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                {isLoading ? 'Copying...' : 'Copy Week'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
