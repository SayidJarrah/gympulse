import { useEffect, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import type {
  AffectedInstanceResponse,
  RoomResponse,
} from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { RoomFormModal } from '../../components/rooms/RoomFormModal'
import { RoomDeleteConfirmModal } from '../../components/rooms/RoomDeleteConfirmModal'
import { deleteRoom, getRooms } from '../../api/rooms'

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-gray-800" aria-hidden="true">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-12 rounded-lg bg-gray-800 animate-pulse" />
              <div className="h-4 w-32 rounded bg-gray-800 animate-pulse" />
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-16 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-48 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="ml-auto h-6 w-16 rounded bg-gray-800 animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function AdminRoomsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rooms, setRooms] = useState<RoomResponse[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<RoomResponse | undefined>(undefined)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<RoomResponse | null>(null)
  const [affectedInstances, setAffectedInstances] = useState<AffectedInstanceResponse[]>([])

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    setPage(0)
  }, [search])

  const fetchRooms = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getRooms({ search: search || undefined, page, size: 200 })
      setRooms(data.content)
      setTotalElements(data.totalElements)
      setTotalPages(data.totalPages)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to load rooms.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page])

  const handleSaved = () => {
    setFormModalOpen(false)
    setEditTarget(undefined)
    fetchRooms()
  }

  const handleDelete = async (room: RoomResponse) => {
    setError(null)
    try {
      const response = await deleteRoom(room.id)
      if (response && response.code === 'ROOM_HAS_INSTANCES') {
        setDeleteTarget(room)
        setAffectedInstances(response.affectedInstances ?? [])
        setDeleteModalOpen(true)
        return
      }
      fetchRooms()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to delete room.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteRoom(deleteTarget.id, true)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setAffectedInstances([])
      fetchRooms()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to delete room.')
    }
  }

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-white">Rooms</h1>
              <p className="text-sm text-gray-400">{totalElements} rooms</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditTarget(undefined)
                setFormModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <PlusIcon className="h-4 w-4" />
              Add Room
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by name"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full max-w-xs rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            />
          </div>

          {error && !isLoading && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0F0F0F]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-busy={isLoading}>
                <thead className="sticky top-0 bg-gray-900">
                  <tr>
                    <th className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Name <ChevronUpIcon className="inline h-3 w-3 text-green-400" />
                    </th>
                    <th className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Capacity
                    </th>
                    <th className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell">
                      Description
                    </th>
                    <th className="border-b border-gray-800 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <TableSkeletonRows />}

                  {!isLoading && rooms.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                            <BuildingOfficeIcon className="h-6 w-6 text-gray-500" />
                          </div>
                          <p className="text-sm font-medium text-white">No rooms found</p>
                          <p className="text-sm text-gray-500">Add your first room to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && rooms.map((room) => (
                    <tr
                      key={room.id}
                      className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-800 bg-gray-950">
                            {room.photoUrl ? (
                              <img
                                src={room.photoUrl}
                                alt={room.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BuildingOfficeIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                            )}
                          </div>
                          <span className="font-medium text-white">{room.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{room.capacity ?? '—'}</td>
                      <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                        {room.description ? (
                          <span className="block max-w-xs truncate">{room.description}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(room)
                              setFormModalOpen(true)
                            }}
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                            aria-label={`Edit ${room.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(room)}
                            className="rounded-md p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            aria-label={`Delete ${room.name}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {!isLoading && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-400">Page {page + 1} of {totalPages}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 disabled:cursor-not-allowed disabled:bg-green-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <RoomFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleSaved}
        editTarget={editTarget}
      />

      <RoomDeleteConfirmModal
        isOpen={deleteModalOpen}
        roomName={deleteTarget ? deleteTarget.name : 'this room'}
        affectedInstances={affectedInstances}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
