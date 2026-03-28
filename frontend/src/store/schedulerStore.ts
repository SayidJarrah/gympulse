import { create } from 'zustand'
import type {
  ClassInstanceResponse,
  ClassTemplateResponse,
  TrainerResponse,
} from '../types/scheduler'
import { getWeekSchedule } from '../api/classInstances'
import { getClassTemplates } from '../api/classTemplates'
import { getTrainers } from '../api/trainers'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/auth'

interface SchedulerStore {
  currentWeek: string;
  instances: ClassInstanceResponse[];
  templates: ClassTemplateResponse[];
  trainers: TrainerResponse[];
  isLoading: boolean;
  error: string | null;
  setCurrentWeek: (week: string) => void;
  fetchWeekSchedule: (week: string) => Promise<void>;
  fetchTemplates: () => Promise<void>;
  fetchTrainers: () => Promise<void>;
  addInstance: (instance: ClassInstanceResponse) => void;
  updateInstance: (instance: ClassInstanceResponse) => void;
  removeInstance: (id: string) => void;
}

export const useSchedulerStore = create<SchedulerStore>((set) => ({
  currentWeek: '',
  instances: [],
  templates: [],
  trainers: [],
  isLoading: false,
  error: null,

  setCurrentWeek: (week) => set({ currentWeek: week }),

  fetchWeekSchedule: async (week) => {
    set({ isLoading: true, error: null })
    try {
      const data = await getWeekSchedule(week)
      set({
        currentWeek: data.week,
        instances: data.instances,
        isLoading: false,
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const message = axiosError.response?.data?.error ?? 'Failed to load schedule.'
      set({ isLoading: false, error: message })
    }
  },

  fetchTemplates: async () => {
    try {
      const data = await getClassTemplates({ page: 0, size: 200 })
      set({ templates: data.content })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const message = axiosError.response?.data?.error ?? 'Failed to load templates.'
      set({ error: message })
    }
  },

  fetchTrainers: async () => {
    try {
      const data = await getTrainers({ page: 0, size: 200 })
      set({ trainers: data.content })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const message = axiosError.response?.data?.error ?? 'Failed to load trainers.'
      set({ error: message })
    }
  },

  addInstance: (instance) =>
    set((state) => ({ instances: [...state.instances, instance] })),

  updateInstance: (instance) =>
    set((state) => ({
      instances: state.instances.map((item) => (item.id === instance.id ? instance : item)),
    })),

  removeInstance: (id) =>
    set((state) => ({
      instances: state.instances.filter((item) => item.id !== id),
    })),
}))
