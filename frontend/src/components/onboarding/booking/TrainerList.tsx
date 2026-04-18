import { useEffect, useState } from 'react'
import axiosInstance from '../../../api/axiosInstance'
import { TrainerCalendar } from './TrainerCalendar'

interface Trainer {
  id: string
  firstName: string
  lastName: string
  specialisations?: string[]
  bio?: string
  rating?: number
  openSlotsThisWeek?: number
}

interface Slot {
  slotStart: string
}

interface TrainerListProps {
  selectedTrainerId: string | null
  selectedSlot: string | null
  onSelect: (trainerId: string, slot: string) => void
  onClear: () => void
}

export function TrainerList({ selectedTrainerId, selectedSlot, onSelect, onClear }: TrainerListProps) {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [slotsByTrainer, setSlotsByTrainer] = useState<Record<string, Slot[]>>({})
  const [loadingSlots, setLoadingSlots] = useState<string | null>(null)

  useEffect(() => {
    axiosInstance
      .get('/trainers/pt')
      .then(res => {
        const data = res.data
        const list = Array.isArray(data) ? data : (data.content ?? [])
        setTrainers(list.slice(0, 6))
      })
      .catch(() => setError('Unable to load trainers.'))
      .finally(() => setLoading(false))
  }, [])

  async function toggleTrainer(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!slotsByTrainer[id]) {
      setLoadingSlots(id)
      try {
        const res = await axiosInstance.get(`/trainers/${id}/pt-availability`)
        setSlotsByTrainer(prev => ({ ...prev, [id]: res.data }))
      } catch {
        setSlotsByTrainer(prev => ({ ...prev, [id]: [] }))
      } finally {
        setLoadingSlots(null)
      }
    }
  }

  if (loading) return <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Loading trainers…</div>
  if (error) return <div className="text-sm" style={{ color: 'var(--color-error-fg)' }}>{error}</div>
  if (trainers.length === 0) return <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>No trainers available.</div>

  return (
    <div className="flex flex-col gap-3">
      {trainers.map(trainer => {
        const isExpanded = expandedId === trainer.id
        const isSelected = selectedTrainerId === trainer.id
        const initials = `${trainer.firstName[0]}${trainer.lastName[0]}`.toUpperCase()
        const slots = slotsByTrainer[trainer.id] ?? []

        return (
          <div
            key={trainer.id}
            className="rounded-xl overflow-hidden transition-all duration-150"
            style={{
              border: `1px solid ${isSelected ? 'var(--color-primary-border)' : 'var(--color-border-card)'}`,
            }}
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => toggleTrainer(trainer.id)}
              className="flex items-center gap-4 w-full p-4 text-left"
              style={{ background: 'var(--color-bg-surface-1)' }}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--color-primary-tint), var(--color-primary-border))', color: 'var(--color-primary-light)' }}
              >
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-fg-default)' }}>
                  {trainer.firstName} {trainer.lastName}
                </p>
                {trainer.specialisations && trainer.specialisations.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                    {trainer.specialisations.slice(0, 2).join(' · ')}
                  </p>
                )}
              </div>

              {isSelected && selectedSlot && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--color-primary-tint)', color: 'var(--color-primary-light)' }}
                >
                  ✓ Selected
                </span>
              )}

              <svg
                className="w-4 h-4 shrink-0 transition-transform duration-200"
                style={{
                  color: 'var(--color-fg-muted)',
                  transform: isExpanded ? 'rotate(180deg)' : '',
                }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Expanded */}
            {isExpanded && (
              <div
                className="p-4 flex flex-col gap-4"
                style={{
                  background: 'var(--color-bg-surface-2)',
                  borderTop: '1px solid var(--color-border-card)',
                }}
              >
                {trainer.bio && (
                  <p className="text-sm" style={{ color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
                    {trainer.bio}
                  </p>
                )}

                {loadingSlots === trainer.id ? (
                  <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>Loading availability…</div>
                ) : (
                  <TrainerCalendar
                    slots={slots}
                    selectedSlot={isSelected ? selectedSlot : null}
                    onSelect={slot => {
                      if (!slot) {
                        onClear()
                      } else {
                        onSelect(trainer.id, slot)
                      }
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
