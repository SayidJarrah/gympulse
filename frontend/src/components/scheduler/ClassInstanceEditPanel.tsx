import { useEffect, useMemo, useState } from 'react'
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type {
  ClassInstancePatchRequest,
  ClassInstanceResponse,
  TrainerResponse,
} from '../../types/scheduler'
import { RoomPicker } from './RoomPicker'
import { formatUtcTime } from '../../utils/week'

interface ClassInstanceEditPanelProps {
  instance: ClassInstanceResponse | null;
  trainers: TrainerResponse[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: ClassInstancePatchRequest) => Promise<void>;
  onDelete: () => Promise<void>;
}

const TIME_OPTIONS = Array.from({ length: 32 }).map((_, index) => {
  const hour = 6 + Math.floor(index / 2)
  const minutes = index % 2 === 0 ? '00' : '30'
  return `${String(hour).padStart(2, '0')}:${minutes}`
})

export function ClassInstanceEditPanel({
  instance,
  trainers,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ClassInstanceEditPanelProps) {
  const [selectedTime, setSelectedTime] = useState('06:00')
  const [durationMin, setDurationMin] = useState(60)
  const [capacity, setCapacity] = useState(20)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<string[]>([])
  const [trainerError, setTrainerError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (instance) {
      setSelectedTime(formatUtcTime(instance.scheduledAt))
      setDurationMin(instance.durationMin)
      setCapacity(instance.capacity)
      setRoomId(instance.room?.id ?? null)
      setSelectedTrainerIds(instance.trainers.map((trainer) => trainer.id))
      setTrainerError(null)
    }
  }, [instance])

  const dateLabel = useMemo(() => {
    if (!instance) return ''
    const date = new Date(instance.scheduledAt)
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  }, [instance])

  if (!isOpen || !instance) return null

  const toggleTrainer = (trainerId: string) => {
    setSelectedTrainerIds((prev) => (
      prev.includes(trainerId) ? prev.filter((id) => id !== trainerId) : [...prev, trainerId]
    ))
  }

  const handleSave = async () => {
    if (!instance) return
    setIsSaving(true)
    setTrainerError(null)
    try {
      const [hour, minute] = selectedTime.split(':').map(Number)
      const date = new Date(instance.scheduledAt)
      const scheduledAt = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hour,
        minute
      )).toISOString()

      const payload: ClassInstancePatchRequest = {
        scheduledAt,
        durationMin,
        capacity,
        roomId,
        trainerIds: selectedTrainerIds,
      }
      await onSave(payload)
      onClose()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { code?: string; error?: string } } }
      const code = error.response?.data?.code
      if (code === 'TRAINER_SCHEDULE_CONFLICT') {
        setTrainerError('Trainer is already assigned to another class at this time.')
      } else {
        setTrainerError(error.response?.data?.error ?? 'Failed to save changes.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-[400px] flex-col border-l border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Edit Class</h2>
          {instance.templateId && (
            <p className="text-xs text-gray-500">From template</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <div>
          <div className="text-base font-semibold text-white">{instance.name}</div>
          <div className="text-sm text-gray-400">{dateLabel}</div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-300">Start Time</label>
          <select
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-300">Duration (min)</label>
            <input
              type="number"
              min={15}
              max={240}
              value={durationMin}
              onChange={(event) => setDurationMin(Number(event.target.value))}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-300">Capacity</label>
            <input
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <RoomPicker value={roomId} onChange={setRoomId} />

        {instance.hasRoomConflict && instance.room?.name && (
          <div className="flex items-start gap-2 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
            <ExclamationTriangleIcon className="h-4 w-4" />
            Another class is scheduled in <span className="font-semibold">{instance.room.name}</span> at an overlapping time.
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-300">Assign Trainers</label>
          <div className={`min-h-[36px] rounded-md border bg-gray-900 p-2 ${
            trainerError ? 'border-red-500/60' : 'border-gray-700'
          }`}>
            {selectedTrainerIds.length === 0 && (
              <div className="text-xs text-gray-500">No trainers assigned</div>
            )}
            <div className="flex flex-wrap gap-1">
              {selectedTrainerIds.map((id) => {
                const trainer = trainers.find((item) => item.id === id)
                if (!trainer) return null
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2 py-0.5 text-xs text-white"
                  >
                    {trainer.firstName} {trainer.lastName}
                    <button
                      type="button"
                      onClick={() => toggleTrainer(id)}
                      className="text-gray-400 hover:text-white"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-800">
            {trainers.map((trainer) => {
              const selected = selectedTrainerIds.includes(trainer.id)
              return (
                <button
                  key={trainer.id}
                  type="button"
                  onClick={() => toggleTrainer(trainer.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm text-white hover:bg-gray-800 ${
                    selected ? 'bg-gray-800' : ''
                  }`}
                >
                  {trainer.firstName} {trainer.lastName}
                  {selected && <ExclamationCircleIcon className="h-4 w-4 text-green-400" />}
                </button>
              )}
            )}
          </div>
          {trainerError && (
            <p className="mt-1 text-xs text-red-400">
              <ExclamationCircleIcon className="mr-1 inline h-3 w-3" />
              {trainerError}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
