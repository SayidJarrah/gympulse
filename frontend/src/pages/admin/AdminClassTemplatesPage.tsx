import { useEffect, useState } from 'react'
import {
  PlusIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import type {
  AffectedInstanceResponse,
  ClassCategory,
  ClassTemplateHasInstancesResponse,
  ClassTemplateResponse,
} from '../../types/scheduler'
import type { ApiErrorResponse } from '../../types/auth'
import type { AxiosError } from 'axios'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { ClassTemplateCard } from '../../components/scheduler/ClassTemplateCard'
import { ClassTemplateFormModal } from '../../components/scheduler/ClassTemplateFormModal'
import { ClassTemplateDeleteConfirmModal } from '../../components/scheduler/ClassTemplateDeleteConfirmModal'
import { deleteClassTemplate, getClassTemplates } from '../../api/classTemplates'

const CATEGORIES: ClassCategory[] = [
  'Cardio',
  'Strength',
  'Flexibility',
  'Mind & Body',
  'Cycling',
  'Combat',
  'Dance',
  'Functional',
  'Aqua',
  'Wellness',
  'Other',
]

function CardSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-40 rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="h-4 w-28 rounded bg-gray-800 animate-pulse" />
          <div className="mt-3 h-3 w-16 rounded bg-gray-800 animate-pulse" />
          <div className="mt-6 h-3 w-40 rounded bg-gray-800 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

export function AdminClassTemplatesPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [page, setPage] = useState(0)
  const [templates, setTemplates] = useState<ClassTemplateResponse[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClassTemplateResponse | undefined>(undefined)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClassTemplateResponse | null>(null)
  const [affectedInstances, setAffectedInstances] = useState<AffectedInstanceResponse[]>([])

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  useEffect(() => {
    setPage(0)
  }, [search, category])

  const fetchTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getClassTemplates({
        search: search || undefined,
        category: category || undefined,
        page,
        size: 18,
      })
      setTemplates(data.content)
      setTotalElements(data.totalElements)
      setTotalPages(data.totalPages)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to load templates.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, page])

  const handleSaved = () => {
    setFormModalOpen(false)
    setEditTarget(undefined)
    fetchTemplates()
  }

  const handleDelete = async (template: ClassTemplateResponse) => {
    setError(null)
    try {
      await deleteClassTemplate(template.id)
      fetchTemplates()
    } catch (err) {
      const axiosError = err as AxiosError<ClassTemplateHasInstancesResponse | ApiErrorResponse>
      const code = axiosError.response?.data && 'code' in axiosError.response.data
        ? axiosError.response.data.code
        : undefined
      if (code === 'CLASS_TEMPLATE_HAS_INSTANCES') {
        const payload = axiosError.response?.data as ClassTemplateHasInstancesResponse
        setDeleteTarget(template)
        setAffectedInstances(payload.affectedInstances ?? [])
        setDeleteModalOpen(true)
      } else {
        setError(axiosError.response?.data?.error ?? 'Failed to delete template.')
      }
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteClassTemplate(deleteTarget.id, true)
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setAffectedInstances([])
      fetchTemplates()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setError(axiosError.response?.data?.error ?? 'Failed to delete template.')
    }
  }

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-[#0F0F0F]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold leading-tight text-white">Class Templates</h1>
              <p className="text-sm text-gray-400">{totalElements} templates</p>
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
              Add Template
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <input
              type="text"
              placeholder="Search templates"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full max-w-xs rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {error && !isLoading && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {isLoading && <CardSkeletons />}

          {!isLoading && templates.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                <CalendarDaysIcon className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-sm font-medium text-white">No templates found</p>
              <p className="text-sm text-gray-500">Create your first class template to get started.</p>
            </div>
          )}

          {!isLoading && templates.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <ClassTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={(target) => {
                    setEditTarget(target)
                    setFormModalOpen(true)
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

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

      <ClassTemplateFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSaved={handleSaved}
        editTarget={editTarget}
      />

      <ClassTemplateDeleteConfirmModal
        isOpen={deleteModalOpen}
        templateName={deleteTarget ? deleteTarget.name : 'this template'}
        affectedInstances={affectedInstances}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
