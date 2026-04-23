import { useState, useRef, useEffect, useId } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid, startOfDay } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import 'react-day-picker/style.css'
import './DateField.css'

interface DateFieldProps {
  id?: string
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

function parseIso(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = parse(value, 'yyyy-MM-dd', new Date())
  return isValid(d) ? startOfDay(d) : undefined
}

export function DateField(props: DateFieldProps) {
  const {
    value,
    onChange,
    min,
    max,
    placeholder = 'dd.mm.yyyy',
    id: providedId,
    disabled,
    className,
    style,
    ...aria
  } = props

  const autoId = useId()
  const id = providedId ?? autoId
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = parseIso(value)
  const minDate = parseIso(min)
  const maxDate = parseIso(max)

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const displayValue = selected ? format(selected, 'dd.MM.yyyy') : ''

  function handleSelect(date: Date | undefined) {
    if (!date) {
      onChange('')
      return
    }
    onChange(format(date, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const today = startOfDay(new Date())
  // For DOB-style fields (past dates), defaulting to 25 years ago gives a
  // sensible landing month rather than showing the current month with every
  // day disabled.
  const defaultMonth =
    selected ??
    (maxDate && maxDate < today ? maxDate : today)
  const startYear = (minDate ?? new Date(1900, 0, 1)).getFullYear()
  const endYear = (maxDate ?? today).getFullYear()

  return (
    <div ref={containerRef} className={`gf-date-field relative ${className ?? ''}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2.5 rounded-md text-sm outline-none transition-all focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,.25)] flex items-center justify-between"
        style={{
          background: 'var(--color-bg-surface-2)',
          border: '1px solid var(--color-border-input)',
          color: displayValue ? 'var(--color-fg-default)' : 'var(--color-fg-muted)',
          ...style,
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        {...aria}
      >
        <span>{displayValue || placeholder}</span>
        <CalendarIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--color-fg-muted)' }} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="gf-date-popover absolute z-50 mt-2 p-3 rounded-lg"
          style={{
            background: 'var(--color-bg-surface-2)',
            border: '1px solid var(--color-border-card)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(34,197,94,0.08)',
          }}
          role="dialog"
          aria-modal="false"
          aria-label="Pick a date"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            captionLayout="dropdown"
            startMonth={new Date(startYear, 0, 1)}
            endMonth={new Date(endYear, 11, 31)}
            defaultMonth={defaultMonth}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            showOutsideDays
            weekStartsOn={1}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                  : <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />,
            }}
          />
        </div>
      )}
    </div>
  )
}
