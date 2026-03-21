import { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  autoComplete: 'current-password' | 'new-password';
  disabled?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  error,
  autoComplete,
  disabled = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={[
            'w-full rounded-md border bg-white px-3 py-2 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:border-transparent',
            error
              ? 'border-red-400 focus-visible:ring-red-400'
              : 'border-gray-300 focus-visible:ring-indigo-500',
            disabled ? 'cursor-not-allowed bg-gray-100 opacity-60' : '',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:rounded-sm"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <EyeIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
