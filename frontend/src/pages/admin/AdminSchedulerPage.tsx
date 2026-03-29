import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowUpTrayIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { ClassPalette } from '../../components/scheduler/ClassPalette'
import { WeekCalendarGrid } from '../../components/scheduler/WeekCalendarGrid'
import { WeekNavigator } from '../../components/scheduler/WeekNavigator'
import { ExportMenu } from '../../components/scheduler/ExportMenu'
import { ImportModal } from '../../components/scheduler/ImportModal'
import { CopyWeekConfirmModal } from '../../components/scheduler/CopyWeekConfirmModal'
import { ClassInstanceEditPanel } from '../../components/scheduler/ClassInstanceEditPanel'
import { useSchedulerStore } from '../../store/schedulerStore'
import { formatWeekString, getWeekStart } from '../../utils/week'
import {
  copyWeek,
  createClassInstance,
  deleteClassInstance,
  exportScheduleCsv,
  exportScheduleIcal,
  importSchedule,
  patchClassInstance,
} from '../../api/classInstances'
import type { ClassInstancePatchRequest, ClassInstanceResponse } from '../../types/scheduler'

export function AdminSchedulerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const defaultWeek = useMemo(() => formatWeekString(new Date()), [])
  const weekParam = searchParams.get('week') || defaultWeek

  const {
    currentWeek,
    instances,
    templates,
    trainers,
    error,
    fetchWeekSchedule,
    fetchTemplates,
    fetchTrainers,
    addInstance,
    replaceInstance,
    updateInstance,
    removeInstance,
  } = useSchedulerStore()

  const [selectedInstance, setSelectedInstance] = useState<ClassInstanceResponse | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isCopyOpen, setIsCopyOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
    fetchTrainers()
  }, [fetchTemplates, fetchTrainers])

  useEffect(() => {
    fetchWeekSchedule(weekParam)
  }, [fetchWeekSchedule, weekParam])

  const weekStart = useMemo(() => getWeekStart(weekParam), [weekParam])

  const handleWeekChange = (nextWeek: string) => {
    setSearchParams({ week: nextWeek })
  }

  const handleDropTemplate = async (templateId: string, scheduledAt: string) => {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return

    const tempId = `temp-${Date.now()}`
    const tempInstance: ClassInstanceResponse = {
      id: tempId,
      templateId: template.id,
      name: template.name,
      type: 'GROUP',
      scheduledAt,
      durationMin: template.defaultDurationMin,
      capacity: template.defaultCapacity,
      room: template.room,
      trainers: [],
      hasRoomConflict: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addInstance(tempInstance)

    try {
      const created = await createClassInstance({
        templateId: template.id,
        name: template.name,
        scheduledAt,
        durationMin: template.defaultDurationMin,
        capacity: template.defaultCapacity,
        roomId: template.room?.id ?? null,
        trainerIds: [],
      })
      replaceInstance(tempId, created)
    } catch (err) {
      removeInstance(tempId)
      setActionError('Failed to create class instance.')
    }
  }

  const handleInstanceDrop = async (instanceId: string, scheduledAt: string) => {
    const instance = instances.find((item) => item.id === instanceId)
    if (!instance) return
    const prev = instance

    updateInstance({ ...instance, scheduledAt })

    try {
      const updated = await patchClassInstance(instanceId, {
        scheduledAt,
        durationMin: instance.durationMin,
        capacity: instance.capacity,
        roomId: instance.room?.id ?? null,
        trainerIds: instance.trainers.map((trainer) => trainer.id),
      })
      updateInstance(updated)
    } catch (err) {
      updateInstance(prev)
      setActionError('Failed to move class instance.')
    }
  }

  const handleSaveInstance = async (payload: ClassInstancePatchRequest) => {
    if (!selectedInstance) return
    const updated = await patchClassInstance(selectedInstance.id, payload)
    updateInstance(updated)
    setSelectedInstance(updated)
  }

  const handleDeleteInstance = async () => {
    if (!selectedInstance) return
    await deleteClassInstance(selectedInstance.id)
    removeInstance(selectedInstance.id)
    setSelectedInstance(null)
  }

  const handleCopyWeek = async () => {
    const result = await copyWeek(weekParam)
    await fetchWeekSchedule(weekParam)
    return result
  }

  const handleImport = async (file: File) => {
    const result = await importSchedule(file)
    await fetchWeekSchedule(weekParam)
    return result
  }

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = async () => {
    const blob = await exportScheduleCsv(weekParam)
    triggerDownload(blob, `schedule-${weekParam}.csv`)
  }

  const handleExportIcal = async () => {
    const blob = await exportScheduleIcal(weekParam)
    triggerDownload(blob, `schedule-${weekParam}.ics`)
  }

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      <AdminSidebar />

      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-800 bg-gray-900 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <WeekNavigator week={currentWeek || weekParam} onChange={handleWeekChange} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCopyOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                Copy Week
              </button>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                Import
              </button>
              <ExportMenu onExportCsv={handleExportCsv} onExportIcal={handleExportIcal} />
            </div>
          </div>
          {actionError && (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {actionError}
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="hidden lg:flex flex-1 overflow-hidden">
          <ClassPalette templates={templates} />
          <WeekCalendarGrid
            weekStart={weekStart}
            instances={instances}
            onInstanceClick={(id) => {
              const found = instances.find((item) => item.id === id) || null
              setSelectedInstance(found)
            }}
            onDropTemplate={handleDropTemplate}
            onInstanceDrop={handleInstanceDrop}
          />
        </div>

        <div className="lg:hidden flex items-center justify-center p-8 text-sm text-gray-400">
          The Scheduler requires a desktop browser. Please use a screen at least 1024px wide.
        </div>
      </div>

      <ClassInstanceEditPanel
        instance={selectedInstance}
        trainers={trainers}
        isOpen={Boolean(selectedInstance)}
        onClose={() => setSelectedInstance(null)}
        onSave={handleSaveInstance}
        onDelete={handleDeleteInstance}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />

      <CopyWeekConfirmModal
        isOpen={isCopyOpen}
        sourceWeek={weekParam}
        count={instances.length}
        onConfirm={handleCopyWeek}
        onClose={() => setIsCopyOpen(false)}
      />
    </div>
  )
}
