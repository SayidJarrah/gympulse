import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  error?: string | null;
}

export function TagInput({
  value,
  onChange,
  max = 10,
  maxLength = 50,
  placeholder = 'Add tag',
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    if (value.includes(next)) return
    if (next.length > maxLength) return
    if (value.length >= max) return
    onChange([...value, next])
    setInputValue('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(inputValue)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`flex flex-wrap gap-1.5 rounded-md border bg-gray-900 px-3 py-2 min-h-[42px] cursor-text transition-colors duration-200 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent ${
          error ? 'border-red-500/60' : 'border-gray-700'
        }`}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2 py-0.5 text-xs text-white"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        {value.length < max ? (
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            placeholder={placeholder}
          />
        ) : (
          <span className="text-xs text-gray-500 italic self-center">Maximum reached</span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
