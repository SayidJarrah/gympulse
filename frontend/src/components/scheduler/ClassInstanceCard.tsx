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

const COMPACT_CARD_HEIGHT = 52

function getTrainerInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
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
  const isCompact = height < COMPACT_CARD_HEIGHT
  const primaryTrainer = instance.trainers[0]
  const extraTrainerCount = Math.max(instance.trainers.length - 1, 0)

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
      className={`group absolute left-1 right-1 z-10 cursor-pointer select-none rounded-md px-2 py-1 text-xs text-white transition-all duration-150 hover:z-20 hover:brightness-110 focus-within:z-20 ${isCompact ? 'overflow-visible' : 'overflow-hidden'} ${borderClass}`}
      style={{ top, height }}
    >
      {isCompact ? (
        <div className="flex h-full items-start justify-between gap-2 overflow-hidden rounded-md">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-semibold leading-4 text-white">
              {instance.name}
            </div>
            <div className="truncate text-[10px] leading-3 text-gray-300">
              {formatUtcTime(instance.scheduledAt)} · {instance.durationMin} min
            </div>
          </div>

          {isUnassigned ? (
            <span
              className="inline-flex h-6 items-center rounded-full bg-red-500/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-red-300"
              title="No trainer assigned"
            >
              <ExclamationCircleIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full bg-gray-700 text-[10px] font-semibold text-white">
              {getTrainerInitials(primaryTrainer.firstName, primaryTrainer.lastName)}
              {extraTrainerCount > 0 && (
                <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[9px] font-semibold text-gray-200 ring-1 ring-gray-600">
                  +{extraTrainerCount}
                </span>
              )}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col justify-between">
          <div className="grid min-h-0 grid-cols-[1fr_auto] gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{instance.name}</div>
              <div className="truncate text-[11px] text-gray-300">
                {formatUtcTime(instance.scheduledAt)} · {instance.durationMin} min
              </div>
            </div>

            {isUnassigned ? (
              <span
                className="inline-flex h-6 items-center rounded-full bg-red-500/15 px-2 text-[10px] font-semibold uppercase tracking-wide text-red-300"
                title="No trainer assigned"
              >
                <ExclamationCircleIcon className="mr-1 h-3.5 w-3.5" />
                !
              </span>
            ) : (
              <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-full bg-gray-700 text-[10px] font-semibold text-white">
                {getTrainerInitials(primaryTrainer.firstName, primaryTrainer.lastName)}
                {extraTrainerCount > 0 && (
                  <span className="absolute -bottom-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[9px] font-semibold text-gray-200 ring-1 ring-gray-600">
                    +{extraTrainerCount}
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="mt-1 flex min-h-0 items-center justify-between gap-2 text-[10px] text-gray-300">
            <div className="flex min-w-0 items-center gap-1 truncate">
              <UserGroupIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{instance.capacity} spots</span>
            </div>
            {isUnassigned && (
              <span className="truncate text-[10px] font-medium text-red-400">Unassigned</span>
            )}
          </div>
        </div>
      )}

      {isCompact && !isUnassigned && (
        <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden min-w-max items-center gap-1 rounded-md border border-gray-700 bg-gray-900/95 px-2 py-1 text-[10px] font-medium text-gray-100 shadow-lg shadow-black/40 group-hover:flex group-focus-within:flex">
          <UserGroupIcon className="h-3 w-3 shrink-0 text-gray-300" />
          <span>{instance.capacity} spots</span>
        </div>
      )}

      {isCompact && isUnassigned && (
        <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden min-w-max items-center gap-1 rounded-md border border-red-500/40 bg-gray-900/95 px-2 py-1 text-[10px] font-medium text-red-300 shadow-lg shadow-black/40 group-hover:flex group-focus-within:flex">
          <ExclamationCircleIcon className="h-3 w-3 shrink-0" />
          <span>No trainer assigned</span>
        </div>
      )}

      {hasRoomConflict && !isUnassigned && (
        <span
          title="Room conflict"
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-orange-500"
        />
      )}
    </div>
  )
}
