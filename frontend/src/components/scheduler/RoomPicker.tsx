import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { getRooms } from '../../api/rooms'
import type { RoomResponse } from '../../types/scheduler'

interface RoomPickerProps {
  value: string | null;
  onChange: (roomId: string | null) => void;
  label?: string;
}

export function RoomPicker({ value, onChange, label = 'Room' }: RoomPickerProps) {
  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const fetchRooms = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getRooms({ page: 0, size: 200 })
        if (mounted) {
          setRooms(data.content)
        }
      } catch (err) {
        if (mounted) {
          setError('Failed to load rooms')
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }
    fetchRooms()
    return () => {
      mounted = false
    }
  }, [])

  const selectedRoom = rooms.find((room) => room.id === value) || null

  const filteredRooms = useMemo(() => {
    if (!query.trim()) return rooms
    const lower = query.toLowerCase()
    return rooms.filter((room) => room.name.toLowerCase().includes(lower))
  }, [query, rooms])

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-semibold text-gray-300" htmlFor="room-picker">
        {label}
      </label>
      <button
        id="room-picker"
        type="button"
        aria-expanded={isOpen}
        disabled={!isLoading && rooms.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-md border bg-gray-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
          error ? 'border-red-500/60' : 'border-gray-700'
        } ${!isLoading && rooms.length === 0 ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <span className={selectedRoom ? 'text-white' : 'text-gray-500'}>
          {!isLoading && rooms.length === 0
            ? 'No rooms found — add one first'
            : selectedRoom
              ? selectedRoom.name
              : 'Select a room'}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rooms"
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-3 text-xs text-gray-400">Loading rooms...</div>
            )}
            {!isLoading && filteredRooms.length === 0 && (
              <div className="px-4 py-3 text-xs text-gray-500">No rooms found</div>
            )}
            {!isLoading && filteredRooms.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null)
                    setIsOpen(false)
                  }}
                  className="flex w-full items-center px-4 py-2 text-left text-xs text-gray-400 hover:bg-gray-800"
                >
                  No room
                </button>
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      onChange(room.id)
                      setIsOpen(false)
                    }}
                    className="flex w-full items-center px-4 py-2 text-left text-sm text-white hover:bg-gray-800"
                  >
                    {room.name}
                    {room.capacity && (
                      <span className="ml-auto text-xs text-gray-500">{room.capacity} cap</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <Link
        to="/admin/rooms"
        className="mt-1 inline-flex text-xs text-green-400 hover:text-green-300"
      >
        Manage rooms →
      </Link>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
