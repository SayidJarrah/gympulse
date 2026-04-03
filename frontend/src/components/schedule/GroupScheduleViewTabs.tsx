import type { ScheduleView } from '../../types/groupClassSchedule'

interface GroupScheduleViewTabsProps {
  view: ScheduleView;
  onChange: (view: ScheduleView) => void;
  disabled?: boolean;
}

const VIEW_OPTIONS: Array<{ label: string; value: ScheduleView }> = [
  { label: 'Week', value: 'week' },
  { label: 'Day', value: 'day' },
  { label: 'List', value: 'list' },
]

export function GroupScheduleViewTabs({
  view,
  onChange,
  disabled = false,
}: GroupScheduleViewTabsProps) {
  return (
    <div className="inline-flex w-full rounded-xl border border-gray-800 bg-[#0F0F0F] p-1 sm:w-auto">
      {VIEW_OPTIONS.map((option) => {
        const isActive = view === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={isActive}
            className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
              isActive
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            } ${disabled ? 'cursor-not-allowed text-gray-600 hover:bg-transparent' : ''}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
