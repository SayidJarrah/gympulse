interface Slot {
  slotStart: string // ISO 8601
}

interface TrainerCalendarProps {
  slots: Slot[]
  selectedSlot: string | null
  onSelect: (slot: string | null) => void
}

export function TrainerCalendar({ slots, selectedSlot, onSelect }: TrainerCalendarProps) {
  // Group slots by day
  const byDay = new Map<string, Slot[]>()
  for (const slot of slots) {
    const d = slot.slotStart.slice(0, 10)
    const existing = byDay.get(d) ?? []
    existing.push(slot)
    byDay.set(d, existing)
  }

  const days = Array.from(byDay.entries())

  if (days.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>No available slots this week.</p>
  }

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(112px, 1fr))` }}>
      {days.map(([day, daySlots]) => {
        const date = new Date(day + 'T00:00:00')
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        return (
          <div key={day} className="flex flex-col gap-1">
            {/* Column header */}
            <div
              className="text-center py-2 rounded-md"
              style={{ background: 'var(--color-bg-surface-2)' }}
            >
              <p className="text-[10px] font-bold uppercase" style={{ letterSpacing: '0.12em', color: 'var(--color-fg-muted)' }}>{dayLabel}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--color-fg-label)' }}>{dateLabel}</p>
            </div>

            {/* Time slots */}
            {daySlots.map(slot => {
              const isSelected = selectedSlot === slot.slotStart
              const time = new Date(slot.slotStart).toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true
              }).toLowerCase()

              return (
                <button
                  key={slot.slotStart}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : slot.slotStart)}
                  className="py-2 px-3 rounded-md text-xs font-medium transition-all duration-150"
                  style={{
                    background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-surface-2)',
                    color: isSelected ? '#0F0F0F' : 'var(--color-fg-label)',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
                  }}
                >
                  {time}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
