import { useEffect, useState } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import type {
  AffectedInstanceResponse,
  TrainerHasAssignmentsResponse,
  TrainerResponse,
} from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { TrainerFormModal } from '../../components/trainers/TrainerFormModal'
import { TrainerDeleteConfirmModal } from '../../components/trainers/TrainerDeleteConfirmModal'
import { deleteTrainer, getTrainers } from '../../api/trainers'

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-gray-800" aria-hidden="true">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-800 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-gray-800 animate-pulse" />
                <div className="h-3 w-40 rounded bg-gray-800 animate-pulse" />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-24 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="hidden px-4 py-3 md:table-cell">
            <div className="h-4 w-28 rounded bg-gray-800 animate-pulse" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="ml-auto h-6 w-16 rounded bg-gray-800 animate-pulse" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function AdminTrainersPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [trainers, setTrainers] = useState<TrainerResponse[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TrainerResponse | undefined>(undefined)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TrainerResponse | null>(null)
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

  const fetchTrainers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTrainers({ search: search || undefined, page, size: 20 })
      setTrainers(data.content)
      setTotalElements(data.totalElements)
      setTotalPages(data.totalPages)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to load trainers.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrainers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page])

  const handleSaved = () => {
    setFormModalOpen(false)
    setEditTarget(undefined)
    fetchTrainers()
  }

  const handleDelete = async (trainer: TrainerResponse) => {
    setError(null)
    try {
      await deleteTrainer(trainer.id)
      fetchTrainers()
    } catch (err) {
      const axiosError = err as AxiosError<TrainerHasAssignmentsResponse | ApiErrorResponse>
      const code = axiosError.response?.data && 'code' in axiosError.response.data
        ? axiosError.response.data.code
        : undefined
      if (code === 'TRAINER_HAS_ASSIGNMENTS') {
        const payload = axiosError.response?.data as TrainerHasAssignmentsResponse
        setDeleteTarget(trainer)
        setAffectedInstances(payload.affectedInstances ?? [])
        setDeleteModalOpen(true)
      } else {
        setError(axiosError.response?.data?.error ?? 'Failed to delete trainer.')
      }
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteTrainer(deleteTarget.id, true)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setAffectedInstances([])
      fetchTrainers()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to delete trainer.')
    }
  }

  const renderSpecialisations = (tags: string[]) => {
    if (tags.length === 0) return <span className="text-gray-500">—</span>
    const visible = tags.slice(0, 3)
    const remaining = tags.length - visible.length
    return (
      <div className="flex flex-wrap gap-1">
        {visible.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-300"
          >
            {tag}
          </span>
        ))}
        {remaining > 0 && (
          <span className="rounded-full border border-gray-700 px-2 py-0.5 text-xs text-gray-400">
            +{remaining} more
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-white">Trainers</h1>
              <p className="text-sm text-gray-400">{totalElements} trainers</p>
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
              Add Trainer
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by name or email"
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
                      Phone
                    </th>
                    <th className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 md:table-cell">
                      Specialisations
                    </th>
                    <th className="border-b border-gray-800 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <TableSkeletonRows />}

                  {!isLoading && trainers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                            <UserGroupIcon className="h-6 w-6 text-gray-500" />
                          </div>
                          <p className="text-sm font-medium text-white">No trainers found</p>
                          <p className="text-sm text-gray-500">Add your first trainer to get started.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && trainers.map((trainer) => {
                    const initials = `${trainer.firstName[0] ?? ''}${trainer.lastName[0] ?? ''}`
                    return (
                      <tr
                        key={trainer.id}
                        className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {trainer.photoUrl ? (
                              <img
                                src={trainer.photoUrl}
                                alt={`${trainer.firstName} ${trainer.lastName}`}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-gray-400">
                                {initials}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white">
                                {trainer.firstName} {trainer.lastName}
                              </p>
                              <p className="text-xs text-gray-500">{trainer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {trainer.phone ?? '—'}
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          {renderSpecialisations(trainer.specialisations ?? [])}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget(trainer)
                                setFormModalOpen(true)
                              }}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
                              aria-label={`Edit ${trainer.firstName} ${trainer.lastName}`}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(trainer)}
                              className="rounded-md p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              aria-label={`Delete ${trainer.firstName} ${trainer.lastName}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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

      <TrainerFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleSaved}
        editTarget={editTarget}
      />

      <TrainerDeleteConfirmModal
        isOpen={deleteModalOpen}
        trainerName={deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : 'this trainer'}
        affectedInstances={affectedInstances}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
