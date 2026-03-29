import { useEffect, useState } from 'react'
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { ImportResultResponse } from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResultResponse>;
}

type ImportState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }
  | { status: 'success'; result: ImportResultResponse }

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<ImportState>({ status: 'idle' })

  useEffect(() => {
    if (isOpen) {
      setFile(null)
      setState({ status: 'idle' })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleUpload = async () => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setState({ status: 'error', message: 'The file exceeds the 2 MB size limit.' })
      return
    }
    setState({ status: 'uploading' })
    try {
      const result = await onImport(file)
      setState({ status: 'success', result })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code
      const message =
        code === 'IMPORT_FORMAT_INVALID'
          ? 'The file is missing required columns or is not a valid CSV.'
          : code === 'IMPORT_FILE_TOO_LARGE'
            ? 'The file exceeds the 2 MB size limit.'
            : axiosError.response?.data?.error ?? 'Import failed.'
      setState({ status: 'error', message })
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && state.status !== 'uploading') onClose()
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            {state.status === 'success' ? 'Import Complete' : 'Import Schedule from CSV'}
          </h2>
        </div>

        <div className="px-6 py-6">
          {state.status === 'idle' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-700 p-6 text-center">
              <DocumentArrowUpIcon className="h-8 w-8 text-gray-500" />
              <div className="text-sm text-gray-400">Click to upload or drag and drop</div>
              <div className="text-xs text-gray-500">
                CSV file — max 2 MB. Required columns: class_name, date, start_time, duration_minutes, capacity
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-2 text-xs text-gray-400"
              />
            </div>
          )}

          {state.status === 'error' && (
            <div className="text-center">
              <XCircleIcon className="mx-auto h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm text-red-400">{state.message}</p>
            </div>
          )}

          {state.status === 'success' && (
            <div>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircleIcon className="h-5 w-5" />
                {state.result.imported} rows imported successfully
              </div>
              {state.result.rejected > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                  <XCircleIcon className="h-5 w-5" />
                  {state.result.rejected} rows rejected
                </div>
              )}

              {state.result.rejected > 0 && (
                <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Reason</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.result.errors.map((error) => (
                        <tr key={`${error.row}-${error.reason}`} className="border-t border-gray-800">
                          <td className="px-3 py-2 text-gray-400">{error.row}</td>
                          <td className="px-3 py-2 text-red-400">{error.reason}</td>
                          <td className="px-3 py-2 text-gray-400">{error.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            {state.status === 'success' ? 'Close' : 'Cancel'}
          </button>
          {state.status === 'idle' && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file}
              className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
            >
              Upload
            </button>
          )}
          {state.status === 'error' && (
            <button
              type="button"
              onClick={() => setState({ status: 'idle' })}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
