import { Link } from 'react-router-dom'
import type { TrainerDiscoveryResponse } from '../../../types/trainerDiscovery'
import { FavoriteButton } from './FavoriteButton'

interface TrainerCardProps {
  trainer: TrainerDiscoveryResponse;
  isMember: boolean;
  onToggleFavorite: (trainerId: string) => void;
  favoriteLoading?: boolean;
}

export function TrainerCard({
  trainer,
  isMember,
  onToggleFavorite,
  favoriteLoading = false,
}: TrainerCardProps) {
  const initials = `${trainer.firstName[0] ?? ''}${trainer.lastName[0] ?? ''}`
  const displayedSpecializations = trainer.specializations.slice(0, 3)
  const extraCount = Math.max(trainer.specializations.length - 3, 0)

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-gray-800 bg-gray-900/70 p-4 shadow-sm transition hover:border-green-500/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {trainer.profilePhotoUrl ? (
            <img
              src={trainer.profilePhotoUrl}
              alt={`${trainer.firstName} ${trainer.lastName}`}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-gray-300">
              {initials}
            </div>
          )}
          <div>
            <Link
              to={`/trainers/${trainer.id}`}
              className="text-sm font-semibold text-white hover:text-green-400"
            >
              {trainer.firstName} {trainer.lastName}
            </Link>
            <p className="text-xs text-gray-400">
              {trainer.experienceYears !== null
                ? `${trainer.experienceYears} yrs experience`
                : 'Experience not specified'}
            </p>
          </div>
        </div>
        <FavoriteButton
          isFavorited={trainer.isFavorited}
          isMember={isMember}
          loading={favoriteLoading}
          onToggle={() => onToggleFavorite(trainer.id)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {displayedSpecializations.map((tag) => (
          <span
            key={`${trainer.id}-${tag}`}
            className="rounded-full border border-gray-700 bg-gray-800/70 px-2.5 py-1 text-[11px] font-medium text-gray-300"
          >
            {tag}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="rounded-full border border-gray-700 bg-gray-800/70 px-2.5 py-1 text-[11px] font-medium text-gray-400">
            +{extraCount} more
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>{trainer.classCount} scheduled classes</span>
        <Link to={`/trainers/${trainer.id}`} className="text-green-400 hover:text-green-300">
          View profile
        </Link>
      </div>
    </div>
  )
}
