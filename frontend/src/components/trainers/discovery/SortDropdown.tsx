import type { TrainerDiscoverySortOption } from '../../../types/trainerDiscovery'

interface SortDropdownProps {
  value: TrainerDiscoverySortOption;
  onChange: (value: TrainerDiscoverySortOption) => void;
}

const SORT_OPTIONS: Array<{ label: string; value: TrainerDiscoverySortOption }> = [
  { label: 'Name A-Z', value: 'lastName,asc' },
  { label: 'Name Z-A', value: 'lastName,desc' },
  { label: 'Most Experienced', value: 'experienceYears,desc' },
  { label: 'Least Experienced', value: 'experienceYears,asc' },
]

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-400" htmlFor="trainer-sort">
        Sort by
      </label>
      <select
        id="trainer-sort"
        value={value}
        onChange={(event) => onChange(event.target.value as TrainerDiscoverySortOption)}
        className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
