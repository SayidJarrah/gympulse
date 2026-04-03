import type { TrainerResponse } from '../../types/scheduler'

interface TrainerCardProps {
  trainer: TrainerResponse;
}

export function TrainerCard({ trainer }: TrainerCardProps) {
  const initials = `${trainer.firstName[0] ?? ''}${trainer.lastName[0] ?? ''}`

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
      {trainer.photoUrl ? (
        <img
          src={trainer.photoUrl}
          alt={`${trainer.firstName} ${trainer.lastName}`}
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-gray-400">
          {initials}
        </div>
      )}
      <div>
        <div className="text-sm font-semibold text-white">
          {trainer.firstName} {trainer.lastName}
        </div>
        <div className="text-xs text-gray-400">{trainer.email}</div>
      </div>
    </div>
  )
}
