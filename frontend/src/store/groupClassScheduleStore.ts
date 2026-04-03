import { create } from 'zustand'
import type { AxiosError } from 'axios'
import type {
  GetGroupClassScheduleParams,
  GroupClassScheduleResponse,
  ScheduleView,
} from '../types/groupClassSchedule'
import type { ApiErrorResponse } from '../types/auth'
import { getGroupClassSchedule } from '../api/groupClassSchedule'
import {
  addDaysToIsoDate,
  getTodayIsoDate,
  resolveTimeZone,
} from '../utils/scheduleDates'

interface GroupClassScheduleState {
  view: ScheduleView;
  anchorDate: string;
  timeZone: string;
  schedule: GroupClassScheduleResponse | null;
  isLoading: boolean;
  error: string | null;
  errorCode: string | null;
  setView: (view: ScheduleView) => void;
  setAnchorDate: (anchorDate: string) => void;
  fetchSchedule: (params?: Partial<GetGroupClassScheduleParams>) => Promise<void>;
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
  goToToday: () => void;
}

const initialTimeZone = resolveTimeZone()
const initialAnchorDate = getTodayIsoDate(initialTimeZone)

export const useGroupClassScheduleStore = create<GroupClassScheduleState>((set, get) => ({
  view: 'week',
  anchorDate: initialAnchorDate,
  timeZone: initialTimeZone,
  schedule: null,
  isLoading: false,
  error: null,
  errorCode: null,

  setView: (view) => set({ view }),
  setAnchorDate: (anchorDate) => set({ anchorDate }),

  fetchSchedule: async (params) => {
    const current = get()
    const nextParams: GetGroupClassScheduleParams = {
      view: params?.view ?? current.view,
      anchorDate: params?.anchorDate ?? current.anchorDate,
      timeZone: params?.timeZone ?? current.timeZone,
    }

    set({
      view: nextParams.view,
      anchorDate: nextParams.anchorDate,
      timeZone: nextParams.timeZone,
      isLoading: true,
      error: null,
      errorCode: null,
      schedule: null,
    })

    try {
      const data = await getGroupClassSchedule(nextParams)
      set({ schedule: data, isLoading: false })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message =
        axiosError.response?.data?.error
        ?? 'We couldn’t load the latest group classes. Please try again.'
      set({
        isLoading: false,
        error: message,
        errorCode: code,
        schedule: null,
      })
    }
  },

  goToPreviousPeriod: () => {
    const { view, anchorDate, timeZone } = get()
    const delta = view === 'week' ? -7 : view === 'day' ? -1 : -14
    set({ anchorDate: addDaysToIsoDate(anchorDate, delta, timeZone) })
  },

  goToNextPeriod: () => {
    const { view, anchorDate, timeZone } = get()
    const delta = view === 'week' ? 7 : view === 'day' ? 1 : 14
    set({ anchorDate: addDaysToIsoDate(anchorDate, delta, timeZone) })
  },

  goToToday: () => {
    const { timeZone } = get()
    set({ anchorDate: getTodayIsoDate(timeZone) })
  },
}))
