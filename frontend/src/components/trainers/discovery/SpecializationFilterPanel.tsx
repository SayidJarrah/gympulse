interface SpecializationFilterPanelProps {
  allSpecializations: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
}

export function SpecializationFilterPanel({
  allSpecializations,
  selected,
  onChange,
  disabled = false,
}: SpecializationFilterPanelProps) {
  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value))
      return
    }
    onChange([...selected, value])
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <div className="mb-3 text-xs font-semibold text-gray-400">Specializations</div>
      <div className="flex flex-col gap-2">
        {allSpecializations.length === 0 && (
          <div className="text-xs text-gray-500">No specializations available.</div>
        )}
        {allSpecializations.map((value) => (
          <label
            key={value}
            className={`flex items-center gap-2 text-sm ${disabled ? 'cursor-not-allowed text-gray-500' : 'text-gray-300'}`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-green-500 focus:ring-green-500"
              checked={selected.includes(value)}
              onChange={() => toggleValue(value)}
              disabled={disabled}
            />
            {value}
          </label>
        ))}
      </div>
    </div>
  )
}
