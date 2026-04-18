import { useEffect, useState } from 'react'
import axiosInstance from '../../../api/axiosInstance'

interface ClassInstance {
  id: string
  className: string
  startTime: string
  endTime: string
  trainerName?: string
  roomName?: string
  spotsAvailable?: number
  capacity?: number
}

interface GroupClassListProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function GroupClassList({ selectedId, onSelect }: GroupClassListProps) {
  const [classes, setClasses] = useState<ClassInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    axiosInstance
      .get('/class-schedule', { params: { view: 'week', anchorDate: today, timeZone: 'UTC' } })
      .then(res => {
        // The schedule endpoint returns a week structure; flatten to instances
        const data = res.data as { days?: { instances?: ClassInstance[] }[] } | ClassInstance[]
        if (Array.isArray(data)) {
          setClasses(data.slice(0, 8))
        } else if (data.days) {
          const all: ClassInstance[] = []
          for (const day of data.days) {
            if (day.instances) all.push(...day.instances)
          }
          setClasses(all.slice(0, 8))
        }
      })
      .catch(() => setError('Unable to load upcoming classes.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Loading classes…</div>
  if (error) return <div className="text-sm" style={{ color: 'var(--color-error-fg)' }}>{error}</div>
  if (classes.length === 0) return <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>No upcoming classes this week.</div>

  return (
    <div className="flex flex-col gap-2">
      {classes.map(cls => {
        const isSelected = selectedId === cls.id
        const start = new Date(cls.startTime)
        const day = start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
        const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
        const date = start.getDate()

        return (
          <button
            key={cls.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : cls.id)}
            className="flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-150 w-full"
            style={{
              background: isSelected ? 'rgba(34,197,94,0.06)' : 'var(--color-bg-surface-1)',
              border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Date tile */}
            <div
              className="flex flex-col items-center justify-center w-20 py-2 rounded-md shrink-0"
              style={{ background: 'var(--color-bg-surface-2)' }}
            >
              <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: '0.12em', color: 'var(--color-fg-muted)' }}>{day}</span>
              <span className="text-base font-bold" style={{ color: 'var(--color-fg-default)' }}>{time}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-fg-muted)' }}>{date}</span>
            </div>

            {/* Class info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>{cls.className}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
                {[cls.trainerName, cls.roomName, cls.spotsAvailable != null ? `${cls.spotsAvailable} spots` : null].filter(Boolean).join(' · ')}
              </p>
            </div>

            {/* Radio */}
            <div
              className="w-5 h-5 rounded-full shrink-0"
              style={{
                border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-card)'}`,
                background: isSelected ? 'var(--color-primary)' : 'transparent',
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
