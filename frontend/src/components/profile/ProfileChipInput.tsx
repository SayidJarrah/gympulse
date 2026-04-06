import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ProfileChipInputProps {
  id: string;
  label: string;
  value: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  maxItems?: number;
}

export function ProfileChipInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  helperText,
  maxItems = 5,
}: ProfileChipInputProps) {
  const [draftValue, setDraftValue] = useState('')

  const addChip = (rawValue: string) => {
    const nextValue = rawValue.trim()
    if (!nextValue) {
      setDraftValue('')
      return
    }

    const hasDuplicate = value.some(
      (item) => item.toLocaleLowerCase() === nextValue.toLocaleLowerCase()
    )
    if (hasDuplicate || value.length >= maxItems) {
      setDraftValue('')
      return
    }

    onChange([...value, nextValue])
    setDraftValue('')
  }

  const removeChip = (itemToRemove: string) => {
    onChange(value.filter((item) => item !== itemToRemove))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addChip(draftValue)
      return
    }

    if (event.key === 'Backspace' && draftValue === '' && value.length > 0) {
      event.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  const helperId = `${id}-helper`
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-gray-200">
        {label}
      </label>

      <div
        className={`flex min-h-[52px] flex-wrap gap-2 rounded-xl border bg-gray-950/70 px-3 py-3 transition-colors duration-200 focus-within:border-transparent focus-within:ring-2 ${
          error
            ? 'border-red-500/60 focus-within:ring-red-500'
            : 'border-gray-700 focus-within:ring-green-500'
        } ${disabled ? 'opacity-70' : ''}`}
      >
        {value.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-sm text-green-100"
          >
            {item}
            <button
              type="button"
              onClick={() => removeChip(item)}
              disabled={disabled}
              className="rounded-full text-green-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed"
              aria-label={`Remove ${item}`}
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        {value.length < maxItems && (
          <input
            id={id}
            type="text"
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addChip(draftValue)}
            disabled={disabled}
            placeholder={placeholder}
            className="min-w-[180px] flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none disabled:cursor-not-allowed"
            aria-invalid={!!error}
            aria-describedby={[helperText ? helperId : null, error ? errorId : null]
              .filter(Boolean)
              .join(' ') || undefined}
          />
        )}

        {value.length >= maxItems && (
          <span className="self-center text-xs text-gray-500">
            Maximum reached
          </span>
        )}
      </div>

      {helperText && (
        <p id={helperId} className="text-xs text-gray-400">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
