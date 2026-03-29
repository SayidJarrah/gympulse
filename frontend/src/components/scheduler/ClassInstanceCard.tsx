import { UserGroupIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import type { ClassInstanceResponse } from '../../types/scheduler'
import { formatUtcTime } from '../../utils/week'

interface ClassInstanceCardProps {
  instance: ClassInstanceResponse;
  top: number;
  height: number;
  onClick: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, id: string) => void;
}

export function ClassInstanceCard({
  instance,
  top,
  height,
  onClick,
  onDragStart,
}: ClassInstanceCardProps) {
  const isUnassigned = instance.trainers.length === 0
  const hasRoomConflict = instance.hasRoomConflict

  const borderClass = isUnassigned
    ? 'border-red-500/50 bg-red-500/10'
    : hasRoomConflict
      ? 'border-orange-500/50 bg-orange-500/10'
      : 'border-green-500/30 bg-green-500/10'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${instance.name}, ${formatUtcTime(instance.scheduledAt)}, ${isUnassigned ? 'Unassigned' : 'Assigned'}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      draggable
      onDragStart={(event) => onDragStart(event, instance.id)}
      className={`absolute left-1 right-1 z-10 cursor-pointer select-none rounded-md border px-2 py-1 text-xs text-white transition-all duration-150 hover:brightness-110 ${borderClass}`}
      style={{ top, height }}
    >
      <div className="truncate text-xs font-semibold text-white">{instance.name}</div>
      <div className="text-xs text-gray-300">
        {formatUtcTime(instance.scheduledAt)} · {instance.durationMin} min
      </div>
      <div className="mt-0.5 flex flex-wrap gap-0.5">
        {isUnassigned ? (
          <span className="text-xs font-medium text-red-400">
            <ExclamationCircleIcon className="mr-0.5 inline h-3 w-3" />
            Unassigned
          </span>
        ) : (
          <>
            {instance.trainers.slice(0, 2).map((trainer) => (
              <span
                key={trainer.id}
                className="inline-flex items-center rounded-full bg-gray-700 px-1.5 py-0.5 text-[10px] text-white"
              >
                {trainer.firstName[0]}{trainer.lastName[0]}
              </span>
            ))}
            {instance.trainers.length > 2 && (
              <span className="inline-flex items-center rounded-full bg-gray-700 px-1.5 py-0.5 text-[10px] text-white">
                +{instance.trainers.length - 2}
              </span>
            )}
          </>
        )}
      </div>
      <div className="mt-0.5 text-[10px] text-gray-300">
        <UserGroupIcon className="mr-0.5 inline h-3 w-3" />
        {instance.capacity} spots
      </div>
      {hasRoomConflict && !isUnassigned && (
        <span
          title="Room conflict"
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-orange-500"
        />
      )}
    </div>
  )
}
