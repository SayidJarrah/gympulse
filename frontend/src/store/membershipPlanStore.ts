import { create } from 'zustand'
import type { MembershipPlan, PlanStatus } from '../types/membershipPlan'
import { getActivePlans, getAdminPlans } from '../api/membershipPlans'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../types/auth'
import { getPlanErrorMessage } from '../utils/planErrors'

interface MembershipPlanState {
  // Public slice
  activePlans: MembershipPlan[];
  activePlansTotalPages: number;
  activePlansPage: number;
  activePlansTotalElements: number;

  // Admin slice
  adminPlans: MembershipPlan[];
  adminPlansTotalPages: number;
  adminPlansPage: number;
  adminPlansTotalElements: number;

  isLoading: boolean;
  error: string | null;

  // Actions
  fetchActivePlans: (page?: number, size?: number) => Promise<void>;
  fetchAdminPlans: (status?: PlanStatus, page?: number, size?: number) => Promise<void>;
  addPlan: (plan: MembershipPlan) => void;
  updatePlanInStore: (plan: MembershipPlan) => void;
  setError: (message: string | null) => void;
}

export const useMembershipPlanStore = create<MembershipPlanState>((set) => ({
  // Public slice initial state
  activePlans: [],
  activePlansTotalPages: 0,
  activePlansPage: 0,
  activePlansTotalElements: 0,

  // Admin slice initial state
  adminPlans: [],
  adminPlansTotalPages: 0,
  adminPlansPage: 0,
  adminPlansTotalElements: 0,

  isLoading: false,
  error: null,

  fetchActivePlans: async (page = 0, size = 20) => {
    set({ isLoading: true, error: null })
    try {
      const data = await getActivePlans(page, size)
      set({
        activePlans: data.content,
        activePlansTotalPages: data.totalPages,
        activePlansPage: data.number,
        activePlansTotalElements: data.totalElements,
        isLoading: false,
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message = getPlanErrorMessage(code, 'Failed to load plans.')
      set({ isLoading: false, error: message })
    }
  },

  fetchAdminPlans: async (status?: PlanStatus, page = 0, size = 20) => {
    set({ isLoading: true, error: null })
    try {
      const data = await getAdminPlans(status, page, size)
      set({
        adminPlans: data.content,
        adminPlansTotalPages: data.totalPages,
        adminPlansPage: data.number,
        adminPlansTotalElements: data.totalElements,
        isLoading: false,
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message = getPlanErrorMessage(code, 'Failed to load plans.')
      set({ isLoading: false, error: message })
    }
  },

  addPlan: (plan: MembershipPlan) =>
    set((state) => ({
      adminPlans: [plan, ...state.adminPlans],
      adminPlansTotalElements: state.adminPlansTotalElements + 1,
      // If the new plan is ACTIVE, also add it to the active public list
      activePlans: plan.status === 'ACTIVE'
        ? [plan, ...state.activePlans]
        : state.activePlans,
      activePlansTotalElements: plan.status === 'ACTIVE'
        ? state.activePlansTotalElements + 1
        : state.activePlansTotalElements,
    })),

  updatePlanInStore: (plan: MembershipPlan) =>
    set((state) => ({
      adminPlans: state.adminPlans.map((p) => (p.id === plan.id ? plan : p)),
      activePlans: plan.status === 'ACTIVE'
        ? state.activePlans.map((p) => (p.id === plan.id ? plan : p))
        : state.activePlans.filter((p) => p.id !== plan.id),
    })),

  setError: (message: string | null) => set({ error: message }),
}))
