import { describe, expect, it } from 'vitest'
import { getWeekSlotTime } from '../week'

describe('getWeekSlotTime', () => {
  it('maps the first visible scheduler slot to 06:00 UTC', () => {
    const weekStart = new Date('2026-03-23T00:00:00.000Z')

    expect(getWeekSlotTime(weekStart, 0, 0, 6).toISOString()).toBe('2026-03-23T06:00:00.000Z')
  })

  it('keeps the visible half-hour grid aligned across days', () => {
    const weekStart = new Date('2026-03-23T00:00:00.000Z')

    expect(getWeekSlotTime(weekStart, 0, 9, 6).toISOString()).toBe('2026-03-23T10:30:00.000Z')
    expect(getWeekSlotTime(weekStart, 2, 1, 6).toISOString()).toBe('2026-03-25T06:30:00.000Z')
  })
})
