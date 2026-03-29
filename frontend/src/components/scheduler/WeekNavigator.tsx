import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { addWeeks, formatWeekLabel, getWeekNumberLabel } from '../../utils/week'

interface WeekNavigatorProps {
  week: string;
  onChange: (week: string) => void;
}

export function WeekNavigator({ week, onChange }: WeekNavigatorProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => onChange(addWeeks(week, -1))}
        className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Next week"
        onClick={() => onChange(addWeeks(week, 1))}
        className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
      <div>
        <div className="text-sm font-semibold text-white">{formatWeekLabel(week)}</div>
        <div className="text-xs text-gray-500">{getWeekNumberLabel(week)}</div>
      </div>
    </div>
  )
}
