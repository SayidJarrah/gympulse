import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline'

interface FavoriteButtonProps {
  isFavorited: boolean;
  isMember: boolean;
  loading?: boolean;
  showLabel?: boolean;
  onToggle: () => void;
}

export function FavoriteButton({
  isFavorited,
  isMember,
  loading = false,
  showLabel = false,
  onToggle,
}: FavoriteButtonProps) {
  const label = isFavorited ? 'Saved' : 'Save'
  const title = isMember ? label : 'Membership required to save favorites.'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!isMember || loading}
      title={title}
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
        isMember
          ? isFavorited
            ? 'border-green-500 text-green-400 hover:bg-green-500/10'
            : 'border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400'
          : 'border-gray-700 text-gray-500 cursor-not-allowed'
      }`}
      aria-pressed={isFavorited}
    >
      {isFavorited ? (
        <HeartSolidIcon className="h-4 w-4" />
      ) : (
        <HeartOutlineIcon className="h-4 w-4" />
      )}
      {showLabel && <span>{label}</span>}
      {loading && <span className="text-[10px] text-gray-400">...</span>}
    </button>
  )
}
