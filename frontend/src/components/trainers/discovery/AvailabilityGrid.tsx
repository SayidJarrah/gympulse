import type { AvailabilityPreview, DayOfWeek, TimeBlock } from '../../../types/trainerDiscovery'

const DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

const TIME_BLOCKS: Array<{ label: string; value: TimeBlock }> = [
  { label: 'Morning', value: 'MORNING' },
  { label: 'Afternoon', value: 'AFTERNOON' },
  { label: 'Evening', value: 'EVENING' },
]

interface AvailabilityGridProps {
  preview: AvailabilityPreview;
}

export function AvailabilityGrid({ preview }: AvailabilityGridProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <div className="grid min-w-[640px] grid-cols-[120px_repeat(7,minmax(80px,1fr))] gap-2">
        <div />
        {DAYS.map((day) => (
          <div key={day} className="text-xs font-semibold text-gray-400 text-center">
            {day.slice(0, 3)}
          </div>
        ))}

        {TIME_BLOCKS.map((block) => (
          <div key={block.value} className="contents">
            <div className="text-xs font-semibold text-gray-400">{block.label}</div>
            {DAYS.map((day) => {
              const isActive = preview[day]?.includes(block.value)
              return (
                <div
                  key={`${day}-${block.value}`}
                  role="gridcell"
                  aria-label={`${day} ${block.label}`}
                  className={`h-10 rounded-lg border ${
                    isActive
                      ? 'border-green-500/70 bg-green-500/20'
                      : 'border-gray-800 bg-gray-950/40'
                  }`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
