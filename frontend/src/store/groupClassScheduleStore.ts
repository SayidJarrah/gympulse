import { create } from 'zustand'
import type { AxiosError } from 'axios'
import type {
  GetGroupClassScheduleParams,
  GroupClassScheduleEntry,
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
  isRefreshing: boolean;
  error: string | null;
  errorCode: string | null;
  setView: (view: ScheduleView) => void;
  setAnchorDate: (anchorDate: string) => void;
  fetchSchedule: (
    params?: Partial<GetGroupClassScheduleParams>,
    options?: { preserveSchedule?: boolean }
  ) => Promise<void>;
  patchScheduleEntry: (
    entryId: string,
    updater: (entry: GroupClassScheduleEntry) => GroupClassScheduleEntry
  ) => void;
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
  isRefreshing: false,
  error: null,
  errorCode: null,

  setView: (view) => set({ view }),
  setAnchorDate: (anchorDate) => set({ anchorDate }),

  fetchSchedule: async (params, options) => {
    const current = get()
    const nextParams: GetGroupClassScheduleParams = {
      view: params?.view ?? current.view,
      anchorDate: params?.anchorDate ?? current.anchorDate,
      timeZone: params?.timeZone ?? current.timeZone,
    }
    const preserveSchedule = options?.preserveSchedule === true && current.schedule !== null

    set({
      view: nextParams.view,
      anchorDate: nextParams.anchorDate,
      timeZone: nextParams.timeZone,
      isLoading: !preserveSchedule,
      isRefreshing: preserveSchedule,
      error: null,
      errorCode: null,
      schedule: preserveSchedule ? current.schedule : null,
    })

    try {
      const data = await getGroupClassSchedule(nextParams)
      set({ schedule: data, isLoading: false, isRefreshing: false })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message =
        axiosError.response?.data?.error
        ?? 'We couldn’t load the latest group classes. Please try again.'
      set({
        isLoading: false,
        isRefreshing: false,
        error: message,
        errorCode: code,
        schedule: preserveSchedule ? current.schedule : null,
      })
    }
  },

  patchScheduleEntry: (entryId, updater) =>
    set((state) => {
      if (!state.schedule) {
        return state
      }

      return {
        schedule: {
          ...state.schedule,
          entries: state.schedule.entries.map((entry) =>
            entry.id === entryId ? updater(entry) : entry
          ),
        },
      }
    }),

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
