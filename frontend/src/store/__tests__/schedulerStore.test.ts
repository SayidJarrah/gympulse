import { beforeEach, describe, expect, it } from 'vitest'
import { useSchedulerStore } from '../schedulerStore'
import type { ClassInstanceResponse } from '../../types/scheduler'

const persistedInstance: ClassInstanceResponse = {
  id: 'instance-1',
  templateId: 'template-1',
  name: 'Morning Yoga',
  type: 'GROUP',
  scheduledAt: '2026-03-23T06:00:00.000Z',
  durationMin: 60,
  capacity: 12,
  room: null,
  trainers: [],
  hasRoomConflict: false,
  createdAt: '2026-03-23T05:00:00.000Z',
  updatedAt: '2026-03-23T05:00:00.000Z',
}

describe('schedulerStore', () => {
  beforeEach(() => {
    useSchedulerStore.setState({
      currentWeek: '',
      instances: [],
      templates: [],
      trainers: [],
      isLoading: false,
      error: null,
    })
  })

  it('replaces an optimistic instance with the persisted backend instance', () => {
    const tempInstance = { ...persistedInstance, id: 'temp-123' }

    useSchedulerStore.getState().addInstance(tempInstance)
    useSchedulerStore.getState().replaceInstance(tempInstance.id, persistedInstance)

    expect(useSchedulerStore.getState().instances).toEqual([persistedInstance])
  })
})
