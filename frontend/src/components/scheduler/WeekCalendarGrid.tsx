import { useMemo, useState } from 'react'
import type { ClassInstanceResponse } from '../../types/scheduler'
import { ClassInstanceCard } from './ClassInstanceCard'
import { formatUtcTime } from '../../utils/week'

const START_HOUR = 6
const END_HOUR = 22
const SLOT_HEIGHT = 40
const SLOT_COUNT = (END_HOUR - START_HOUR) * 2

interface WeekCalendarGridProps {
  weekStart: Date;
  instances: ClassInstanceResponse[];
  onInstanceClick: (id: string) => void;
  onDropTemplate: (templateId: string, scheduledAt: string) => void;
  onInstanceDrop: (instanceId: string, scheduledAt: string) => void;
}

export function WeekCalendarGrid({
  weekStart,
  instances,
  onInstanceClick,
  onDropTemplate,
  onInstanceDrop,
}: WeekCalendarGridProps) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000)
      return date
    })
  }, [weekStart])

  const slots = useMemo(() => Array.from({ length: SLOT_COUNT }, (_, i) => i), [])

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    timeZone: 'UTC',
  })

  const handleDrop = (dayIndex: number, slotIndex: number, dataTransfer: DataTransfer) => {
    const templateId = dataTransfer.getData('templateId')
    const instanceId = dataTransfer.getData('instanceId')
    if (!templateId && !instanceId) return

    const scheduledAt = new Date(
      weekStart.getTime()
        + dayIndex * 24 * 60 * 60 * 1000
        + slotIndex * 30 * 60 * 1000
    ).toISOString()

    if (templateId) {
      onDropTemplate(templateId, scheduledAt)
    }

    if (instanceId) {
      onInstanceDrop(instanceId, scheduledAt)
    }
  }

  const renderedCards = useMemo(() => {
    return instances.map((instance) => {
      const date = new Date(instance.scheduledAt)
      const dayIndex = (date.getUTCDay() + 6) % 7
      const hour = date.getUTCHours()
      const minute = date.getUTCMinutes()
      const slotIndex = (hour - START_HOUR) * 2 + (minute === 30 ? 1 : 0)
      if (slotIndex < 0 || slotIndex >= SLOT_COUNT) return null
      const top = slotIndex * SLOT_HEIGHT
      const height = (instance.durationMin / 30) * SLOT_HEIGHT

      return {
        instance,
        dayIndex,
        top,
        height,
      }
    })
  }, [instances])

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0F0F0F]">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-800 bg-gray-900 sticky top-[49px] z-10">
        <div className="h-12" />
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className="border-l border-gray-800 py-2 text-center"
            role="columnheader"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {dayLabels[index]}
            </div>
            <div className="text-sm font-semibold text-white">
              {dayFormatter.format(day)}
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {slots.map((slotIndex) => {
            const time = new Date(
              weekStart.getTime() + slotIndex * 30 * 60 * 1000 + START_HOUR * 60 * 60 * 1000
            )
            const timeLabel = slotIndex % 2 === 0 ? formatUtcTime(time.toISOString()) : ''

            return (
              <div key={`row-${slotIndex}`} className="contents">
                <div className="h-10 pr-2 text-right text-xs text-gray-500 pt-1">
                  {timeLabel}
                </div>
                {days.map((_, dayIndex) => {
                  const cellKey = `${dayIndex}-${slotIndex}`
                  const isDragOver = dragOverKey === cellKey

                  return (
                    <div
                      key={cellKey}
                      role="gridcell"
                      aria-label={`${dayLabels[dayIndex]} ${timeLabel || 'slot'}`}
                      className={`relative h-10 border-t border-l border-gray-800 transition-colors duration-100 ${
                        slotIndex % 2 === 0 ? 'border-t border-gray-700' : ''
                      } ${isDragOver ? 'bg-green-500/10 border border-green-500/40' : ''}`}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDragOverKey(cellKey)
                      }}
                      onDragLeave={() => setDragOverKey(null)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setDragOverKey(null)
                        handleDrop(dayIndex, slotIndex, event.dataTransfer)
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>

        <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,1fr)] pointer-events-none">
          <div />
          {days.map((_, dayIndex) => (
            <div key={`overlay-${dayIndex}`} className="relative">
              {renderedCards
                .filter((card) => card && card.dayIndex === dayIndex)
                .map((card) => {
                  if (!card) return null
                  return (
                    <div key={card.instance.id} className="pointer-events-auto">
                      <ClassInstanceCard
                        instance={card.instance}
                        top={card.top}
                        height={card.height}
                        onClick={() => onInstanceClick(card.instance.id)}
                        onDragStart={(event, id) => {
                          event.dataTransfer.setData('instanceId', id)
                        }}
                      />
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
