import type { ReactNode } from 'react'
import { PhotoIcon, UserCircleIcon } from '@heroicons/react/24/outline'

interface EntityImageFieldProps {
  title: string;
  helperText: string;
  inputId: string;
  variant: 'avatar' | 'room' | 'cover';
  previewUrl: string | null;
  previewAlt: string;
  fallback: ReactNode;
  statusMessage?: string | null;
  statusTone?: 'default' | 'info' | 'success';
  errorMessage?: string | null;
  actionLabel: string;
  removeLabel: string;
  showRemove: boolean;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
}

const PREVIEW_CLASSES: Record<EntityImageFieldProps['variant'], string> = {
  avatar: 'h-24 w-24 rounded-2xl',
  room: 'h-28 w-36 rounded-2xl',
  cover: 'h-28 w-full max-w-[260px] rounded-2xl',
}

const FALLBACK_WRAPPER_CLASSES: Record<EntityImageFieldProps['variant'], string> = {
  avatar:
    'flex items-center justify-center rounded-2xl bg-green-500/10 text-green-300 ring-1 ring-green-500/20',
  room:
    'flex items-center justify-center rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900 text-gray-300',
  cover:
    'flex items-center justify-center rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-300',
}

export function EntityImageField({
  title,
  helperText,
  inputId,
  variant,
  previewUrl,
  previewAlt,
  fallback,
  statusMessage,
  statusTone = 'default',
  errorMessage,
  actionLabel,
  removeLabel,
  showRemove,
  disabled = false,
  onFileSelect,
  onRemove,
}: EntityImageFieldProps) {
  const previewClassName = PREVIEW_CLASSES[variant]
  const fallbackClassName = FALLBACK_WRAPPER_CLASSES[variant]
  const statusClassName = errorMessage
    ? 'text-red-400'
    : statusTone === 'success'
      ? 'text-green-400'
      : statusTone === 'info'
        ? 'text-blue-400'
        : 'text-gray-500'

  return (
    <section className="rounded-2xl border border-gray-800 bg-[#0F0F0F] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={previewAlt}
              className={`${previewClassName} object-cover`}
            />
          ) : (
            <div className={`${previewClassName} ${fallbackClassName}`}>
              {fallback}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-400">{helperText}</p>
          </div>

          <label
            htmlFor={inputId}
            className={`mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-700 bg-gray-950/60 px-5 py-6 text-center text-gray-400 transition-colors duration-200 ${
              disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-gray-500'
            }`}
          >
            {variant === 'avatar' ? (
              <UserCircleIcon className="h-8 w-8 text-gray-500" aria-hidden="true" />
            ) : (
              <PhotoIcon className="h-8 w-8 text-gray-500" aria-hidden="true" />
            )}
            <span className="text-sm">Click to upload or drag and drop</span>
            <span className="text-xs text-gray-500">JPEG, PNG or WEBP - max 5 MB</span>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label
              htmlFor={inputId}
              className={`inline-flex cursor-pointer items-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-green-600 ${
                disabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              {actionLabel}
            </label>
            {showRemove && (
              <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="rounded-md px-3 py-2 text-sm text-red-300 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removeLabel}
              </button>
            )}
          </div>

          <p
            aria-live="polite"
            className={`mt-3 text-xs ${statusClassName}`}
          >
            {errorMessage ?? statusMessage ?? 'JPEG, PNG or WEBP - max 5 MB'}
          </p>
        </div>
      </div>
    </section>
  )
}
