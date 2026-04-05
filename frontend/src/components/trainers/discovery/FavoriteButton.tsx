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
  const ariaLabel = loading
    ? (isFavorited ? 'Removing...' : 'Saving...')
    : label

  const button = (
    <button
      type="button"
      onClick={isMember && !loading ? onToggle : undefined}
      disabled={loading}
      aria-disabled={!isMember || loading}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${
        loading
          ? 'border-gray-700 text-gray-500 pointer-events-none'
          : isMember
            ? isFavorited
              ? 'border-green-500 text-green-400 hover:bg-green-500/10'
              : 'border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400'
            : 'border-gray-700 text-gray-500 pointer-events-none cursor-not-allowed'
      }`}
      aria-pressed={isFavorited}
    >
      {loading ? (
        <svg
          className="h-4 w-4 animate-spin text-gray-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : isFavorited ? (
        <HeartSolidIcon className="h-4 w-4" />
      ) : (
        <HeartOutlineIcon className="h-4 w-4" />
      )}
      {showLabel && <span>{loading ? (isFavorited ? 'Removing...' : 'Saving...') : label}</span>}
    </button>
  )

  return !isMember ? (
    <span title="Membership required to save favorites.">{button}</span>
  ) : (
    button
  )
}
