import { useRef, useState } from 'react'

interface FieldRowProps {
  label: string;
  value: string;
  editAriaLabel: string;
  /** Called with the new value when Save is clicked. Should throw on validation failure. */
  onSave: (value: string) => Promise<void>;
  isSaving?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

/**
 * Pulse-DNA field row primitive.
 * Grid: 160px label | 1fr value | auto edit button
 * Click Edit → input replaces value with Save/Cancel.
 * Enter saves, Escape cancels, Tab through fields.
 */
export function FieldRow({ label, value, editAriaLabel, onSave, isSaving, error, readOnly }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleEdit = () => {
    setDraft(value)
    setLocalError(null)
    setEditing(true)
    // Auto-focus happens via useEffect equivalent (ref callback not needed — just queue)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleCancel = () => {
    setEditing(false)
    setLocalError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setLocalError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed.'
      setLocalError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const displayError = localError ?? error

  return (
    <div>
      <div
        className="grid items-center gap-4 py-[18px]"
        style={{ gridTemplateColumns: '160px 1fr auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-fg-metadata, #6B7280)' }}
        >
          {label}
        </div>

        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving || isSaving}
            className="rounded-lg border border-green-500/40 bg-white/5 px-3 py-1.5 text-[15px] font-medium text-white outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/50 disabled:opacity-60"
            style={{ fontSize: 15 }}
          />
        ) : (
          <div className="text-[15px] font-medium text-white">{value || <span className="text-gray-500">—</span>}</div>
        )}

        {readOnly ? (
          <div />
        ) : editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { void handleSave() }}
              disabled={saving || isSaving}
              className="rounded-lg border border-green-500/30 px-3 py-1.5 text-[12px] font-500 text-green-400 transition-[filter] duration-[160ms] hover:brightness-110 disabled:opacity-50"
              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500 }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || isSaving}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-medium text-gray-400 transition-[filter] duration-[160ms] hover:brightness-110 disabled:opacity-50"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            aria-label={editAriaLabel}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-[filter] duration-[160ms] hover:brightness-110"
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--color-fg-label, #D1D5DB)',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Edit
          </button>
        )}
      </div>

      {displayError && (
        <p className="mt-1 mb-2 text-xs text-red-400" role="alert">{displayError}</p>
      )}
    </div>
  )
}
